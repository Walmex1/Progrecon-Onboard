import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import client from "../api/client";
import { useAuth } from "../store/auth.jsx";
import { FOGLALKOZASI_VISZONY, TELJES_MUNKAIDOS } from "../constants/options";
import iranyitoszamok from "../data/iranyitoszamok.json";
import { validateField } from "./useEntryValidation";

const REQUIRED_TEXT_FIELDS = [
  "vezeteknev", "keresztnev", "szuletesi_nev", "anyja_neve", "szuletesi_hely",
  "szuletesi_datum", "adoazonosito", "taj", "jogviszony_kezdete",
  "besorolasi_ber", "bankszamlaszam", "kedvezmenyezett_neve",
  "kozterulet", "lakcim_telepules", "lakcim_hazszam",
];

const REQUIRED_SELECT_FIELDS = [
  "neme", "allampolgarsag", "lakcim_orszag", "lakcim_iranyitoszam",
  "lakcim_kozterulet_jellege", "munkaido_napi_ora", "foglalkozasi_viszony",
  "berezesi_mod", "regio", "egyseg", "munkakor", "feor", "koltseghelyKod",
];

const STEP_REQUIRED_FIELDS = [
  [
    "vezeteknev", "keresztnev", "szuletesi_nev", "anyja_neve", "szuletesi_hely",
    "szuletesi_datum", "neme", "allampolgarsag", "adoazonosito", "taj",
  ],
  [
    "lakcim_orszag", "lakcim_iranyitoszam", "lakcim_telepules",
    "kozterulet", "lakcim_kozterulet_jellege", "lakcim_hazszam",
  ],
  [
    "jogviszony_kezdete", "munkaido_napi_ora", "foglalkozasi_viszony",
    "berezesi_mod", "besorolasi_ber",
  ],
  ["regio", "egyseg", "munkakor", "feor", "koltseghelyKod"],
  ["bankszamlaszam", "kedvezmenyezett_neve"],
  ["szep_kartya_szam", "szep_kartya_kibocsato", "szep_kedvezmenyezett"],
];

export function useEntryForm({ id }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entryId, setEntryId] = useState(id || null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const autoSaveTimer = useRef(null);
  const creatingEntryRef = useRef(null);

  useEffect(() => {
    if (user && !["pv", "admin"].includes(user.role)) {
      navigate("/", { replace: true });
    }
  }, [navigate, user]);

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
    if (!entryId || submitDone) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      autoSave(form);
    }, 1500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [entryId, form, submitDone]);

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

  // Kedvezményezett auto-kitöltés vezeteknev + keresztnev alapján
  useEffect(() => {
    const autoVal = [form.vezeteknev, form.keresztnev].filter(Boolean).join(" ");
    if (!autoVal) return;
    setForm((prev) => {
      const next = { ...prev };
      if (!prev.kedvezmenyezett_neve || prev.kedvezmenyezett_neve === prev._autoKedv) {
        next.kedvezmenyezett_neve = autoVal;
        next._autoKedv = autoVal;
      }
      if (!prev.szep_kedvezmenyezett || prev.szep_kedvezmenyezett === prev._autoSzep) {
        next.szep_kedvezmenyezett = autoVal;
        next._autoSzep = autoVal;
      }
      return next;
    });
  }, [form.vezeteknev, form.keresztnev]);

  async function autoSave(data) {
    if (!entryId) return;
    setSaving(true);
    setSaveError(false);
    try {
      await client.patch(`/entries/${entryId}`, { form_data: data });
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  async function ensureEntry() {
    if (entryId) return entryId;
    if (creatingEntryRef.current) return creatingEntryRef.current;

    creatingEntryRef.current = client.post("/entries/", {
      record_type: "belep",
      cost_center_id: null,
    }).then((res) => {
      setEntryId(res.data.id);
      navigate(`/belepok/${res.data.id}`, { replace: true });
      creatingEntryRef.current = null;
      return res.data.id;
    }).catch((err) => {
      creatingEntryRef.current = null;
      throw err;
    });

    return creatingEntryRef.current;
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const snapshot = { ...form, [field]: value };
      const error = validateField(field, value, snapshot);
      setErrors((prev) => ({ ...prev, [field]: error || undefined }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function onBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field], form);
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  }

  const szepAnyFilled = !!(
    form.szep_kartya_szam ||
    form.szep_kartya_kibocsato ||
    form.szep_kedvezmenyezett
  );

  const szepValid = !szepAnyFilled || (
    !!(form.szep_kartya_szam || "").trim() &&
    !!form.szep_kartya_kibocsato &&
    !!(form.szep_kedvezmenyezett || "").trim()
  );

  const isFormComplete =
    REQUIRED_TEXT_FIELDS.every((f) => (form[f] || "").toString().trim() !== "") &&
    REQUIRED_SELECT_FIELDS.every((f) => !!form[f]) &&
    szepValid;

  function isFieldFilled(field) {
    return (form[field] || "").toString().trim() !== "";
  }

  function isStepComplete(index) {
    if (index === 5 && !szepAnyFilled) return false;
    return STEP_REQUIRED_FIELDS[index].every((field) => isFieldFilled(field) && !errors[field]);
  }

  function foglalkozasiOptions() {
    const ora = form.munkaido_napi_ora;
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
        toast.warning("Az adatlap hibákat tartalmaz. Ellenőrizd a pirossal jelölt mezőket. [PO-WARN-VAL]");
      } else if (err.response?.status === 403) {
        toast.error("Nincs jogosultságod ezt a rekordot beküldeni. [PO-ERR-403]");
      } else {
        toast.error("Váratlan hiba történt a beküldés során. Próbáld újra. [PO-ERR-SUBMIT]");
      }
    }
  }

  return {
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
  };
}
