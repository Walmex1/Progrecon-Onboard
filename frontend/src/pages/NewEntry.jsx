import { useNavigate, useParams } from "react-router-dom";
import ReactSelect from "react-select";
import { useEntryForm } from "../hooks/useEntryForm";
import { useEffect, useState } from "react";
import client from "../api/client";

import {
  NEME_OPTIONS,
  BEREZESI_MOD,
  SZEP_KIBOCSATO,
  MUNKAIDO_OPTIONS,
  KOZTERULET_JELLEGE_OPTIONS,
  ALLAMPOLGARSAG_OPTIONS,
  ORSZAG_OPTIONS,
  MUNKAKOR_OPTIONS,
} from "../constants/options";

import iranyitoszamok from "../data/iranyitoszamok.json";
import feor08 from "../data/feor08.json";

const iranyitoszamOptions = Object.entries(iranyitoszamok).map(([irsz, adat]) => ({
  value: irsz,
  label: `${irsz} — ${adat.telepules}`,
}));

const feorOptions = Object.entries(feor08).map(([kod, nev]) => ({
  value: kod,
  label: `${kod} — ${nev}`,
}));

const STEPS = [
  "Személyes adatok",
  "Lakcím",
  "Jogviszony",
  "Munkakör és besorolás",
  "Bankszámla",
  "SZÉP-kártya",
];

const filterName = (value) => value.replace(/[^a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ .-]/g, "");
const filterPhone = (value) => value.replace(/[^0-9+\-() ]/g, "");
const filterNonNegativeNumber = (value) => {
  const digits = value.replace(/[^\d]/g, "");
  return digits;
};

function formatGroups(digits, maxGroups) {
  return digits
    .slice(0, maxGroups * 8)
    .match(/.{1,8}/g)
    ?.join("-") || "";
}

function handleDateInput(value, prev = "") {
  const isDeletingMask = prev.endsWith("-") && value === prev.slice(0, -1);
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const nextDigits = isDeletingMask ? prev.replace(/\D/g, "").slice(0, -1) : digits;

  if (nextDigits.length <= 4) return nextDigits;
  if (nextDigits.length <= 6) return `${nextDigits.slice(0, 4)}-${nextDigits.slice(4)}`;
  return `${nextDigits.slice(0, 4)}-${nextDigits.slice(4, 6)}-${nextDigits.slice(6)}`;
}

function handleAccountInput(value, prev = "", maxGroups = 3) {
  const isDeletingMask = prev.endsWith("-") && value === prev.slice(0, -1);
  const digits = value.replace(/\D/g, "").slice(0, maxGroups * 8);
  const nextDigits = isDeletingMask ? prev.replace(/\D/g, "").slice(0, -1) : digits;
  return formatGroups(nextDigits, maxGroups);
}

function F({
  label,
  field,
  type = "text",
  required,
  form,
  errors,
  set,
  onBlur,
  submitDone,
  filterFn,
  dateMask = false,
  accountMaskGroups,
  maxLength,
  touched = {},
  showSuccess = false,
}) {
  const value = form[field] || "";
  const isSuccess = showSuccess && touched[field] && !errors[field] && value.length > 0;

  function handleChange(e) {
    let nextValue = e.target.value;
    if (dateMask) {
      nextValue = handleDateInput(nextValue, value);
    } else if (accountMaskGroups) {
      nextValue = handleAccountInput(nextValue, value, accountMaskGroups);
    } else if (filterFn) {
      nextValue = filterFn(nextValue);
    }
    set(field, nextValue);
  }

  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}{required && <span style={{ color: "#e74c3c" }}> *</span>}</label>
      <div style={{ position: "relative" }}>
        <input
          name={field}
          style={{
            ...styles.input,
            ...(errors[field] ? styles.inputError : {}),
            ...(isSuccess ? { paddingRight: "30px" } : {}),
          }}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={() => onBlur(field)}
          readOnly={submitDone}
          maxLength={dateMask ? 10 : accountMaskGroups ? 26 : maxLength}
          placeholder={dateMask ? "ÉÉÉÉ-HH-NN" : undefined}
        />
        {isSuccess && (
          <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#27ae60", fontSize: "1rem", pointerEvents: "none" }}>✓</span>
        )}
      </div>
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
        inputId={field}
        name={field}
        options={options}
        value={selectedOption}
        onChange={(selected) => set(field, selected ? selected.value : "")}
        isDisabled={submitDone}
        placeholder="— Válassz —"
        noOptionsMessage={() => "Nincs találat"}
        styles={{
          control: (base, state) => ({
            ...base,
            borderColor: errors[field] ? "#e74c3c" : state.isFocused ? "#534AB7" : "#d1d5db",
            boxShadow: state.isFocused ? "0 0 0 2px rgba(83,74,183,0.15)" : "none",
            borderRadius: "8px",
            fontSize: "13px",
            minHeight: "34px",
            "&:hover": { borderColor: state.isFocused ? "#534AB7" : "#9ca3af" },
          }),
          option: (base, state) => ({
            ...base,
            fontSize: "13px",
            backgroundColor: state.isSelected ? "#534AB7" : state.isFocused ? "#eeedfe" : "#fff",
            color: state.isSelected ? "#fff" : "#1a1a2e",
          }),
          placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "13px" }),
          singleValue: (base) => ({ ...base, color: "#1a1a2e", fontSize: "13px" }),
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
  const navigate = useNavigate();
  const [costCenters, setCostCenters] = useState([]);
  useEffect(() => {
    client.get("/cost-centers/").then(res => setCostCenters(res.data));
  }, []);
  const regioOptions = [...new Set(costCenters.map(cc => cc.region).filter(Boolean))].sort().map(r => ({ value: r, label: r }));
  const egysegOptions = [...new Map(costCenters.map(cc => [cc.name, { value: cc.code, label: cc.name }])).values()];
  const koltseghelyOptions = costCenters.map(cc => ({ value: cc.code, label: `${cc.code} — ${cc.name}` }));
  const {
    entryId,
    form,
    errors,
    touched,
    saving,
    saveError,
    submitDone,
    currentStep,
    setCurrentStep,
    set,
    onBlur,
    isStepComplete,
    isFormComplete,
    szepAnyFilled,
    foglalkozasiOptions,
    handleSubmit,
  } = useEntryForm({ id });

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h2 style={styles.title}>{submitDone ? "Belépő megtekintése" : "Új belépő rögzítése"}</h2>
      </div>

      <div style={{
        background: "#fff",
        border: "0.5px solid #e2e4e9",
        borderRadius: "12px",
        marginBottom: "16px",
        display: "flex",
      }}>
        {STEPS.map((step, index) => {
          const isActive = currentStep === index;
          const isComplete = isStepComplete(index);
          return (
            <button
              key={step}
              type="button"
              aria-current={isActive ? "step" : undefined}
              aria-label={`${index + 1}. lépés: ${step}`}
              onClick={() => setCurrentStep(index)}
              style={{
                flex: 1,
                padding: "14px 8px",
                textAlign: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              <div style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                margin: "0 auto 6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 500,
                background: isComplete || isActive ? "#534AB7" : "#fff",
                color: isComplete || isActive ? "#fff" : "#9ca3af",
                border: isComplete || isActive ? "0.5px solid #534AB7" : "0.5px solid #d1d5db",
              }}>
                {isComplete ? "✓" : index + 1}
              </div>
              <div style={{ fontSize: "11px", color: isActive ? "#1a1a2e" : "#6b7280", fontWeight: isActive ? 500 : 400 }}>
                {step}
              </div>
            </button>
          );
        })}
      </div>

      {currentStep === 0 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Személyes adatok</h3>
          <div style={styles.grid}>
            <F label="Előnév" field="elonev" filterFn={filterName} form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
            <F label="Vezetéknév" field="vezeteknev" required filterFn={filterName} form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
            <F label="Keresztnév" field="keresztnev" required filterFn={filterName} form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
            <F label="Születési név" field="szuletesi_nev" required filterFn={filterName} form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
            <F label="Anyja neve" field="anyja_neve" required filterFn={filterName} form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
            <F label="Születési hely" field="szuletesi_hely" required filterFn={filterName} form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
            <F label="Születési idő (ÉÉÉÉ-HH-NN)" field="szuletesi_datum" required dateMask form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
            <S label="Neme" field="neme" required options={NEME_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
            <S label="Állampolgárság" field="allampolgarsag" required options={ALLAMPOLGARSAG_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
            <F label="Adóazonosító jel" field="adoazonosito" required maxLength={10} form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} showSuccess={true} />
            <F label="TAJ szám" field="taj" required maxLength={9} form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} showSuccess={true} />
            <F label="Törzsszám" field="torzsszam" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
            <F label="E-mail cím" field="email" type="text" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
            <F label="Telefonszám" field="telefonszam" filterFn={filterPhone} form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
          </div>
        </section>
      )}

      {currentStep === 1 && (
        <>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Állandó lakcím</h3>
            <div style={styles.grid}>
              <S label="Ország" field="lakcim_orszag" required options={ORSZAG_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
              <div style={styles.field}>
                <label style={styles.label}>Irányítószám<span style={{ color: "#e74c3c" }}> *</span></label>
                <ReactSelect
                  inputId="lakcim_iranyitoszam"
                  name="lakcim_iranyitoszam"
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
                      borderColor: errors.lakcim_iranyitoszam ? "#e74c3c" : state.isFocused ? "#534AB7" : "#d1d5db",
                      boxShadow: state.isFocused ? "0 0 0 2px rgba(83,74,183,0.15)" : "none",
                      borderRadius: "8px",
                      fontSize: "13px",
                      minHeight: "34px",
                      "&:hover": { borderColor: state.isFocused ? "#534AB7" : "#9ca3af" },
                    }),
                    option: (base, state) => ({
                      ...base,
                      fontSize: "13px",
                      backgroundColor: state.isSelected ? "#534AB7" : state.isFocused ? "#eeedfe" : "#fff",
                      color: state.isSelected ? "#fff" : "#1a1a2e",
                    }),
                    placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "13px" }),
                    singleValue: (base) => ({ ...base, color: "#1a1a2e", fontSize: "13px" }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  menuPortalTarget={document.body}
                />
                {errors.lakcim_iranyitoszam && <span style={styles.fieldError}>{errors.lakcim_iranyitoszam}</span>}
              </div>
              <F label="Település" field="lakcim_telepules" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
              <F label="Közterület neve" field="kozterulet" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
              <S label="Közterület jellege" field="lakcim_kozterulet_jellege" required options={KOZTERULET_JELLEGE_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
              <F label="Házszám" field="lakcim_hazszam" required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
              <F label="Épület" field="lakcim_epulet" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
              <F label="Lépcsőház" field="lakcim_lepcsoehaz" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
              <F label="Emelet" field="lakcim_emelet" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
              <F label="Ajtó" field="lakcim_ajto" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
            </div>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Tartózkodási hely (opcionális)</h3>
            <div style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>Irányítószám</label>
                <ReactSelect
                  inputId="tart_iranyitoszam"
                  name="tart_iranyitoszam"
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
                      borderColor: errors.tart_iranyitoszam ? "#e74c3c" : state.isFocused ? "#534AB7" : "#d1d5db",
                      boxShadow: state.isFocused ? "0 0 0 2px rgba(83,74,183,0.15)" : "none",
                      borderRadius: "8px",
                      fontSize: "13px",
                      minHeight: "34px",
                      "&:hover": { borderColor: state.isFocused ? "#534AB7" : "#9ca3af" },
                    }),
                    option: (base, state) => ({
                      ...base,
                      fontSize: "13px",
                      backgroundColor: state.isSelected ? "#534AB7" : state.isFocused ? "#eeedfe" : "#fff",
                      color: state.isSelected ? "#fff" : "#1a1a2e",
                    }),
                    placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "13px" }),
                    singleValue: (base) => ({ ...base, color: "#1a1a2e", fontSize: "13px" }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  menuPortalTarget={document.body}
                />
                {errors.tart_iranyitoszam && <span style={styles.fieldError}>{errors.tart_iranyitoszam}</span>}
              </div>
              <F label="Település" field="tart_telepules" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
              <F label="Közterület" field="tart_kozterulet" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
              <S label="Közterület jellege" field="tart_kozterulet_jellege" options={KOZTERULET_JELLEGE_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
              <F label="Házszám" field="tart_hazszam" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
              <F label="Épület" field="tart_epulet" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
              <F label="Lépcsőház" field="tart_lepcsoehaz" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
              <F label="Emelet" field="tart_emelet" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
              <F label="Ajtó" field="tart_ajto" form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
            </div>
          </section>
        </>
      )}

      {currentStep === 2 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Jogviszony</h3>
          <div style={styles.grid}>
            <F label="Jogviszony kezdete (ÉÉÉÉ-HH-NN)" field="jogviszony_kezdete" required dateMask form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
            <F label="Jogviszony vége (ÉÉÉÉ-HH-NN)" field="jogviszony_vege" dateMask form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
            <S label="Munkaidő (napi óra)" field="munkaido_napi_ora" required options={MUNKAIDO_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
            <S label="Foglalkozási viszony" field="foglalkozasi_viszony" required options={foglalkozasiOptions()} form={form} errors={errors} set={set} submitDone={submitDone} />
            <S label="Bérezés módja" field="berezesi_mod" required options={BEREZESI_MOD} form={form} errors={errors} set={set} submitDone={submitDone} />
            <F label="Besorolási bér (Ft)" field="besorolasi_ber" type="text" filterFn={filterNonNegativeNumber} required form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
          </div>
        </section>
      )}

      {currentStep === 3 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Munkakör és besorolás</h3>
          <div style={styles.grid}>
            <S label="Régió" field="regio" required options={regioOptions} form={form} errors={errors} set={set} submitDone={submitDone} />
            <S label="Egység" field="egyseg" required options={egysegOptions} form={form} errors={errors} set={set} submitDone={submitDone} />
            <S label="Munkakör" field="munkakor" required options={MUNKAKOR_OPTIONS} form={form} errors={errors} set={set} submitDone={submitDone} />
            <div style={styles.field}>
              <label style={styles.label}>FEOR szám<span style={{ color: "#e74c3c" }}> *</span></label>
              <ReactSelect
                inputId="feor"
                name="feor"
                options={feorOptions}
                value={feorOptions.find((o) => o.value === form.feor) || null}
                onChange={(selected) => set("feor", selected ? selected.value : "")}
                onBlur={() => onBlur("feor")}
                isDisabled={submitDone}
                isSearchable
                placeholder="— Válassz —"
                noOptionsMessage={() => "Nincs találat"}
                formatOptionLabel={(option, { context }) => (context === "value" ? option.value : option.label)}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    borderColor: errors.feor ? "#e74c3c" : state.isFocused ? "#534AB7" : "#d1d5db",
                    boxShadow: state.isFocused ? "0 0 0 2px rgba(83,74,183,0.15)" : "none",
                    borderRadius: "8px",
                    fontSize: "13px",
                    minHeight: "34px",
                    "&:hover": { borderColor: state.isFocused ? "#534AB7" : "#9ca3af" },
                  }),
                  option: (base, state) => ({
                    ...base,
                    fontSize: "13px",
                    backgroundColor: state.isSelected ? "#534AB7" : state.isFocused ? "#eeedfe" : "#fff",
                    color: state.isSelected ? "#fff" : "#1a1a2e",
                  }),
                  placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "13px" }),
                  singleValue: (base) => ({ ...base, color: "#1a1a2e", fontSize: "13px" }),
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
                menuPortalTarget={document.body}
              />
              {errors.feor && <span style={styles.fieldError}>{errors.feor}</span>}
            </div>
            <S label="Költséghely" field="koltseghelyKod" required options={koltseghelyOptions} form={form} errors={errors} set={set} submitDone={submitDone} />
          </div>
        </section>
      )}

      {currentStep === 4 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Bankszámla</h3>
          <div style={styles.grid}>
            <F label="Bankszámlaszám" field="bankszamlaszam" required accountMaskGroups={3} form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} showSuccess={true} />
            <F label="Kedvezményezett neve" field="kedvezmenyezett_neve" required filterFn={filterName} form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
          </div>
        </section>
      )}

      {currentStep === 5 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>SZÉP-kártya (opcionális)</h3>
          <div style={styles.grid}>
            <F label="SZÉP-kártya szám" field="szep_kartya_szam" required={szepAnyFilled} accountMaskGroups={3} form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} showSuccess={true} />
            <S label="Kibocsátó" field="szep_kartya_kibocsato" required={szepAnyFilled} options={SZEP_KIBOCSATO} form={form} errors={errors} set={set} submitDone={submitDone} />
            <F label="Kedvezményezett neve" field="szep_kedvezmenyezett" required={szepAnyFilled} filterFn={filterName} form={form} errors={errors} set={set} onBlur={onBlur} submitDone={submitDone} touched={touched} />
          </div>
        </section>
      )}

      <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "12px" }}>
        <button
          style={styles.backBtn}
          onClick={() => {
            if (currentStep === 0) navigate(-1);
            else setCurrentStep((prev) => prev - 1);
          }}
        >
          ← Vissza
        </button>

        <span style={{ fontSize: "12px", color: saveError ? "#e74c3c" : "#888" }}>
          {submitDone
            ? "Csak olvasható"
            : saving
            ? "Mentés..."
            : saveError
            ? "⚠ Mentés sikertelen — adatok elveszhetnek"
            : entryId
            ? "Mentve"
            : ""}
        </span>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {submitDone ? (
            <button
              style={styles.submitBtn}
              onClick={() => navigate(-1)}
            >
              Vissza a listához
            </button>
          ) : currentStep < STEPS.length - 1 ? (
            <button
              style={styles.submitBtn}
              onClick={() => setCurrentStep((prev) => prev + 1)}
            >
              Tovább →
            </button>
          ) : (
            <button
              style={{ ...styles.submitBtn, ...(!isFormComplete ? styles.submitBtnDisabled : {}) }}
              onClick={handleSubmit}
              disabled={!isFormComplete}
            >
              Elküldés bérszámfejtőnek
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: "900px", padding: "24px" },
  backBtn: { background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "12px", padding: "0 0 1rem 0", display: "block" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title: { margin: 0, fontWeight: 500, fontSize: "1.3rem" },
  saveStatus: { fontSize: "0.85rem", color: "#888" },
  section: { background: "#fff", border: "0.5px solid #e2e4e9", borderRadius: "12px", padding: "20px 24px", marginBottom: "12px" },
  sectionTitle: { margin: "0 0 14px", fontSize: "13px", fontWeight: 500, color: "#1a1a2e" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" },
  field: { display: "flex", flexDirection: "column" },
  label: { fontSize: "11.5px", color: "#6b7280", marginBottom: "3px" },
  input: { width: "100%", padding: "7px 10px", border: "0.5px solid #d1d5db", borderRadius: "8px", fontSize: "13px", color: "#1a1a2e", boxSizing: "border-box", outline: "none" },
  inputError: { borderColor: "#e74c3c" },
  fieldError: { fontSize: "0.8rem", color: "#e74c3c", marginTop: "3px" },
  actions: { marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" },
  submitBtn: { background: "#534AB7", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "8px", fontSize: "13px", cursor: "pointer" },
  submitBtnDisabled: { background: "#95a5a6", cursor: "not-allowed", opacity: 0.7 },
  sentBanner: { marginTop: "1rem", padding: "12px 16px", background: "#eafaf1", border: "0.5px solid #27ae60", borderRadius: "8px", color: "#1e8449", fontSize: "0.9rem" },
};
