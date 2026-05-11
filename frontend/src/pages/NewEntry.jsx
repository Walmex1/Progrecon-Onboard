import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactSelect from "react-select";
import client from "../api/client";
import { useAuth } from "../store/auth.jsx";

import {
  NEME_OPTIONS,
  FOGLALKOZASI_VISZONY,
  TELJES_MUNKAIDOS,
  BEREZESI_MOD,
  SZEP_KIBOCSATO,
  MUNKAIDО_OPTIONS,
  KOZTERULET_JELLEGE_OPTIONS,
  ALLAMPOLGARSAG_OPTIONS,
  ORSZAG_OPTIONS,
  REGIO_OPTIONS,
  EGYSEG_OPTIONS,
  MUNKAKOR_OPTIONS,
  FEOR_OPTIONS,
  KOLTSEGHELYAZ_OPTIONS,
} from "../constants/options";

import iranyitoszamok from "../data/iranyitoszamok.json";

const iranyitoszamOptions = Object.entries(iranyitoszamok).map(([irsz, adat]) => ({
  value: irsz,
  label: `${irsz} — ${adat.telepules}`,
}));

function F({ label, field, type = "text", required, form, errors, set, onBlur, submitDone }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}{required && <span style={{ color: "#e74c3c" }}> *</span>}</label>
      <input
        style={{ ...styles.input, ...(errors[field] ? styles.inputError : {}) }}
        type={type}
        value={form[field] || ""}
        onChange={(e) => set(field, e.target.value)}
        onBlur={() => onBlur(field)}
        readOnly={submitDone}
      />
      {errors[field] && <span style={styles.fieldError}>{errors[field]}</span>}
    </div>
  );
}

function S({ label, field, options, required, form, errors, set, submitDone }) {
  const selectedOption = options.find((o) => o.value === form[field]) || null;
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}{required && <span style={{ color: "#e74c3c" }}> *</span>}</label>
      <ReactSelect
        options={options}
        value={selectedOption}
        onChange={(selected) => set(field, selected ? selected.value : "")}
        isDisabled={submitDone}
        placeholder="— Válassz —"
        noOptionsMessage={() => "Nincs találat"}
        styles={{
          control: (base, state) => ({
            ...base,
            borderColor: errors[field] ? "#e74c3c" : state.isFocused ? "#3498db" : "#ddd",
            boxShadow: state.isFocused ? "0 0 0 1px #3498db" : "none",
            borderRadius: "4px",
            fontSize: "0.95rem",
            minHeight: "36px",
            "&:hover": { borderColor: state.isFocused ? "#3498db" : "#bbb" },
          }),
          option: (base, state) => ({
            ...base,
            fontSize: "0.95rem",
            backgroundColor: state.isSelected ? "#3498db" : state.isFocused ? "#eaf4fb" : "#fff",
            color: state.isSelected ? "#fff" : "#2c3e50",
          }),
          placeholder: (base) => ({ ...base, color: "#aaa", fontSize: "0.95rem" }),
          singleValue: (base) => ({ ...base, color: "#2c3e50", fontSize: "0.95rem" }),
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        }}
        menuPortalTarget={document.body}
      />
      {errors[field] && <span style={styles.fieldError}>{errors[field]}</span>}
    </div>
  );
}

export default function NewEntry() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entryId, setEntryId] = useState(id || null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [szepOpen, setSzepOpen] = useState(true);
  const [tartOpen, setTartOpen] = useState(true);
  const [submitDone, setSubmitDone] = useState(false);
  const autoSaveTimer = useRef(null);

  // Betöltés ha már meglévő rekord
  useEffect(() => {
    if (entryId) {
      client.get(`/entries/${entryId}`).then((res) => {
        setForm(res.data.form_data || {});
        if (res.data.status !== "folyamatban") setSubmitDone(true);
      });
    }
  }, [entryId]);

  // Automatikus mentés
  useEffect(() => {
    if (!entryId) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      autoSave(form);
    }, 1500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [form]);

  // Állandó lakcím: irányítószám → település automata kitöltés
  useEffect(() => {
    const match = iranyitoszamok[form.lakcim_iranyitoszam];
    if (match && match.telepules !== form.lakcim_telepules) {
      setForm((prev) => ({ ...prev, lakcim_telepules: match.telepules }));
    }
  }, [form.lakcim_iranyitoszam]);

  // Tartózkodási hely: irányítószám → település automata kitöltés
  useEffect(() => {
    const match = iranyitoszamok[form.tart_iranyitoszam];
    if (match && match.telepules !== form.tart_telepules) {
      setForm((prev) => ({ ...prev, tart_telepules: match.telepules }));
    }
  }, [form.tart_iranyitoszam]);

  async function autoSave(data) {
    if (!entryId) return;
    setSaving(true);
    try {
      await client.patch(`/entries/${entryId}`, { form_data: data });
    } finally {
      setSaving(false);
    }
  }

  async function ensureEntry() {
    if (entryId) return entryId;
    const res = await client.post("/entries/", {
      record_type: "belep",
      cost_center_id: user.costCenterIds?.[0],
    });
    setEntryId(res.data.id);
    navigate(`/belepok/${res.data.id}`, { replace: true });
    return res.data.id;
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function onBlur(field) {
    ensureEntry();
  }

  function foglalkozasiOptions() {
    const ora = form.munkaidо_napi_ora;
    if (ora === "8") return FOGLALKOZASI_VISZONY.filter((f) => TELJES_MUNKAIDOS.includes(f.value));
    if (ora && ora !== "8") return FOGLALKOZASI_VISZONY.filter((f) => !TELJES_MUNKAIDOS.includes(f.value));
    return FOGLALKOZASI_VISZONY;
  }

  async function handleSubmit() {
    const id = await ensureEntry();
    await autoSave(form);
    try {
      await client.post(`/entries/${id}/submit`);
      setSubmitDone(true);
      navigate("/belepok/folyamatban");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.validation_errors) {
        const errs = {};
        detail.validation_errors.forEach((e) => { errs[e.field] = e.message; });
        setErrors(errs);
      }
    }
  }

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={() => navigate(-1)}>← Vissza</button>
      <div style={styles.topBar}>
        <h2 style={styles.title}>Új belépő rögzítése</h2>
        <span style={styles.saveStatus}>{saving ? "Mentés..." : entryId ? "Mentve" : ""}</span>
      </div>

      {/* 1. Személyes adatok */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Személyes adatok</h3>
        <div style={styles.grid}>
          <F label="Előnév" field="elonev" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Vezetéknév" field="vezeteknev" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Keresztnév" field="keresztnev" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Születési név" field="szuletesi_nev" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Anyja neve" field="anyja_neve" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Születési hely" field="szuletesi_hely" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Születési idő (ÉÉÉÉ-HH-NN)" field="szuletesi_datum" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <S label="Neme" field="neme" required options={NEME_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
          <S label="Állampolgárság" field="allampolgarsag" required options={ALLAMPOLGARSAG_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
          <F label="Adóazonosító jel" field="adoazonosito" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="TAJ szám" field="taj" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Törzsszám" field="torzsszam" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="E-mail cím" field="email" type="email" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Telefonszám" field="telefonszam" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
        </div>
      </section>

      {/* 2. Állandó lakcím */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Állandó lakcím</h3>
        <div style={styles.grid}>
          <S label="Ország" field="lakcim_orszag" required options={ORSZAG_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
          <div style={styles.field}>
            <label style={styles.label}>Irányítószám<span style={{ color: "#e74c3c" }}> *</span></label>
            <ReactSelect
              options={iranyitoszamOptions}
              value={iranyitoszamOptions.find((o) => o.value === form.lakcim_iranyitoszam) || null}
              onChange={(selected) => set("lakcim_iranyitoszam", selected ? selected.value : "")}
              onBlur={() => onBlur("lakcim_iranyitoszam")}
              isDisabled={submitDone}
              placeholder="— Válassz —"
              noOptionsMessage={() => "Nincs találat"}
              formatOptionLabel={(option, { context }) => (context === "value" ? option.value : option.label)}
              styles={{
                control: (base, state) => ({
                  ...base,
                  borderColor: errors.lakcim_iranyitoszam ? "#e74c3c" : state.isFocused ? "#3498db" : "#ddd",
                  boxShadow: state.isFocused ? "0 0 0 1px #3498db" : "none",
                  borderRadius: "4px",
                  fontSize: "0.95rem",
                  minHeight: "36px",
                  "&:hover": { borderColor: state.isFocused ? "#3498db" : "#bbb" },
                }),
                option: (base, state) => ({
                  ...base,
                  fontSize: "0.95rem",
                  backgroundColor: state.isSelected ? "#3498db" : state.isFocused ? "#eaf4fb" : "#fff",
                  color: state.isSelected ? "#fff" : "#2c3e50",
                }),
                placeholder: (base) => ({ ...base, color: "#aaa", fontSize: "0.95rem" }),
                singleValue: (base) => ({ ...base, color: "#2c3e50", fontSize: "0.95rem" }),
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              }}
              menuPortalTarget={document.body}
            />
            {errors.lakcim_iranyitoszam && <span style={styles.fieldError}>{errors.lakcim_iranyitoszam}</span>}
          </div>
          <F label="Település" field="lakcim_telepules" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Közterület neve" field="kozterulet" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <S label="Közterület jellege" field="lakcim_kozterulet_jellege" required options={KOZTERULET_JELLEGE_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
          <F label="Házszám" field="lakcim_hazszam" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Épület" field="lakcim_epulet" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Lépcsőház" field="lakcim_lepcsoehaz" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Emelet" field="lakcim_emelet" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Ajtó" field="lakcim_ajto" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
        </div>
      </section>

      {/* 3. Tartózkodási hely */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Tartózkodási hely (opcionális)</h3>
        <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Irányítószám</label>
              <ReactSelect
                options={iranyitoszamOptions}
                value={iranyitoszamOptions.find((o) => o.value === form.tart_iranyitoszam) || null}
                onChange={(selected) => set("tart_iranyitoszam", selected ? selected.value : "")}
                onBlur={() => onBlur("tart_iranyitoszam")}
                isDisabled={submitDone}
                placeholder="— Válassz —"
                noOptionsMessage={() => "Nincs találat"}
                formatOptionLabel={(option, { context }) => (context === "value" ? option.value : option.label)}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    borderColor: errors.tart_iranyitoszam ? "#e74c3c" : state.isFocused ? "#3498db" : "#ddd",
                    boxShadow: state.isFocused ? "0 0 0 1px #3498db" : "none",
                    borderRadius: "4px",
                    fontSize: "0.95rem",
                    minHeight: "36px",
                    "&:hover": { borderColor: state.isFocused ? "#3498db" : "#bbb" },
                  }),
                  option: (base, state) => ({
                    ...base,
                    fontSize: "0.95rem",
                    backgroundColor: state.isSelected ? "#3498db" : state.isFocused ? "#eaf4fb" : "#fff",
                    color: state.isSelected ? "#fff" : "#2c3e50",
                  }),
                  placeholder: (base) => ({ ...base, color: "#aaa", fontSize: "0.95rem" }),
                  singleValue: (base) => ({ ...base, color: "#2c3e50", fontSize: "0.95rem" }),
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
                menuPortalTarget={document.body}
              />
              {errors.tart_iranyitoszam && <span style={styles.fieldError}>{errors.tart_iranyitoszam}</span>}
            </div>
            <F label="Település" field="tart_telepules" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
            <F label="Közterület" field="tart_kozterulet" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
            <S label="Közterület jellege" field="tart_kozterulet_jellege" options={KOZTERULET_JELLEGE_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
            <F label="Házszám" field="tart_hazszam" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
            <F label="Épület" field="tart_epulet" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
            <F label="Lépcsőház" field="tart_lepcsoehaz" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
            <F label="Emelet" field="tart_emelet" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
            <F label="Ajtó" field="tart_ajto" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
        </div>
      </section>

      {/* 4. Jogviszony */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Jogviszony</h3>
        <div style={styles.grid}>
          <F label="Jogviszony kezdete (ÉÉÉÉ-HH-NN)" field="jogviszony_kezdete" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Jogviszony vége (ÉÉÉÉ-HH-NN)" field="jogviszony_vege" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <S label="Munkaidő (napi óra)" field="munkaidо_napi_ora" required
            options={MUNKAIDО_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
          <S label="Foglalkozási viszony" field="foglalkozasi_viszony" required options={foglalkozasiOptions()} form={form} errors={errors} set={set} submitDone={submitDone} />
          <S label="Bérezés módja" field="berezesi_mod" required options={BEREZESI_MOD} form={form} errors={errors} set={set} submitDone={submitDone} />
          <F label="Besorolási bér (Ft)" field="besorolasi_ber" type="number" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
        </div>
      </section>

      {/* 5. Munkakör és besorolás */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Munkakör és besorolás</h3>
        <div style={styles.grid}>
          <S label="Régió" field="regio" required options={REGIO_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
          <S label="Egység" field="egyseg" required options={EGYSEG_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
          <S label="Munkakör" field="munkakor" required options={MUNKAKOR_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
          <S label="FEOR szám" field="feor" required options={FEOR_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
          <S label="Költséghely" field="koltseghelyKod" required options={KOLTSEGHELYAZ_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
        </div>
      </section>

      {/* 6. Bankszámla */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Bankszámla</h3>
        <div style={styles.grid}>
          <F label="Bankszámlaszám" field="bankszamlaszam" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
          <F label="Kedvezményezett neve" field="kedvezmenyezett_neve" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
        </div>
      </section>

      {/* 7. SZÉP-kártya */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>SZÉP-kártya (opcionális)</h3>
        <div style={styles.grid}>
            <F label="SZÉP-kártya szám" field="szep_kartya_szam" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
            <S label="Kibocsátó" field="szep_kartya_kibocsato" required options={SZEP_KIBOCSATO} form={form} errors={errors} set={set} submitDone={submitDone} />
            <F label="Kedvezményezett neve" field="szep_kedvezmenyezett" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} />
        </div>
      </section>

      {!submitDone && (
        <div style={styles.actions}>
          <button style={styles.submitBtn} onClick={handleSubmit}>
            Elküldés bérszámfejtőnek
          </button>
        </div>
      )}

      {submitDone && (
        <div style={styles.sentBanner}>
          Ez a rekord már el lett küldve a bérszámfejtőnek.
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: "860px" },
  backBtn: { background: "none", border: "none", cursor: "pointer", color: "#3498db", fontSize: "0.9rem", padding: "0 0 1rem 0", display: "block" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title: { margin: 0, fontWeight: 500, fontSize: "1.3rem" },
  saveStatus: { fontSize: "0.85rem", color: "#888" },
  section: { background: "#fff", borderRadius: "8px", padding: "1.5rem", marginBottom: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  sectionTitle: { margin: "0 0 1rem", fontSize: "1rem", fontWeight: 500, color: "#2c3e50" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  field: { display: "flex", flexDirection: "column" },
  label: { fontSize: "0.85rem", color: "#555", marginBottom: "4px" },
  input: { padding: "8px 10px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.95rem" },
  inputError: { borderColor: "#e74c3c" },
  fieldError: { fontSize: "0.8rem", color: "#e74c3c", marginTop: "3px" },
  toggleBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem", color: "#2c3e50", padding: 0, fontWeight: 500 },
  actions: { marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" },
  submitBtn: { background: "#27ae60", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "4px", fontSize: "1rem", cursor: "pointer" },
  sentBanner: { marginTop: "1rem", padding: "12px 16px", background: "#eafaf1", border: "1px solid #27ae60", borderRadius: "4px", color: "#1e8449", fontSize: "0.9rem" },
};
