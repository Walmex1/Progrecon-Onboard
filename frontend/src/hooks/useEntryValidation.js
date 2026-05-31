export function validateField(field, value, currentForm) {
  const snapshot = currentForm;
  const v = (value ?? "").toString().trim();

  const NAME_FIELDS = [
    "vezeteknev", "keresztnev", "szuletesi_nev", "anyja_neve", "szuletesi_hely",
  ];
  if (NAME_FIELDS.includes(field) && v) {
    if (v.trim().length < 2) return "Legalább 2 karakter szükséges";
  }

  if (field === "adoazonosito" && v) {
    if (!/^\d{10}$/.test(v)) return "Az adóazonosító jel 10 számjegyből áll";
    if (v[0] !== "8") return "Az adóazonosító jel 8-cal kezdődik";
    const weights = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const total = weights.reduce((s, w, i) => s + w * parseInt(v[i]), 0);
    if (total % 11 !== parseInt(v[9])) return "Az adóazonosító jel ellenőrző száma hibás";
    const birth = snapshot.szuletesi_datum;
    if (birth && /^\d{4}-\d{2}-\d{2}$/.test(birth)) {
      const base = new Date(1867, 0, 1);
      const days = parseInt(v.slice(1, 6));
      const derived = new Date(base.getTime() + days * 86400000);
      const derivedStr = `${derived.getFullYear()}-${String(derived.getMonth() + 1).padStart(2, "0")}-${String(derived.getDate()).padStart(2, "0")}`;
      if (derivedStr !== birth) return `Az adóazonosítóból ${derivedStr} születési dátum következik`;
    }
  }

  if (field === "szuletesi_datum" && v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Formátum: ÉÉÉÉ-HH-NN";
    const tax = snapshot.adoazonosito;
    if (tax && /^\d{10}$/.test(tax) && tax[0] === "8") {
      const base = new Date(1867, 0, 1);
      const days = parseInt(tax.slice(1, 6));
      const derived = new Date(base.getTime() + days * 86400000);
      const derivedStr = `${derived.getFullYear()}-${String(derived.getMonth() + 1).padStart(2, "0")}-${String(derived.getDate()).padStart(2, "0")}`;
      if (derivedStr !== v) return `Az adóazonosítóból ${derivedStr} születési dátum következik`;
    }
  }

  if (field === "taj" && v) {
    const cleaned = v.replace(/\D/g, "");
    if (!/^\d{9}$/.test(cleaned)) return "A TAJ szám 9 számjegyből áll";
    const weights = [3, 7, 3, 7, 3, 7, 3, 7];
    const total = weights.reduce((s, w, i) => s + w * parseInt(cleaned[i]), 0);
    if (total % 10 !== parseInt(cleaned[8])) return "A TAJ szám ellenőrző száma hibás";
  }

  if (field === "bankszamlaszam" && v) {
    const cleaned = v.replace(/-/g, "");
    if (!/^\d{16}$|^\d{24}$/.test(cleaned)) return "A bankszámlaszám 2×8 vagy 3×8 számjegy";
  }

  if (["jogviszony_kezdete", "jogviszony_vege"].includes(field) && v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Formátum: ÉÉÉÉ-HH-NN";
  }

  if (field === "telefonszam" && v) {
    const digits = v.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 11 || /\s{2,}/.test(v)) {
      return "Érvénytelen telefonszám (8-11 számjegy elvárás, pl. +36 30 123 4567)";
    }
  }

  if (field === "email" && v) {
    if (v.length > 254) return "Az e-mail cím maximum 254 karakter lehet";
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(v)) {
      return "Érvénytelen e-mail cím (pl. nev@domain.hu)";
    }
  }

  if (field === "besorolasi_ber" && v) {
    const num = parseInt(v, 10);
    if (isNaN(num) || num <= 0) return "A besorolási bérnek pozitív számnak kell lennie";
  }

  if (field === "foglalkozasi_viszony" && v) {
    const munkaido = currentForm.munkaido_napi_ora;
    const teljesMunkaidos = ["01", "05", "41"];
    if (munkaido && munkaido !== "8" && teljesMunkaidos.includes(v)) {
      return "Teljes munkaidős foglalkozási viszony csak 8 órás munkaidőnél választható";
    }
    if (munkaido && munkaido === "8" && !teljesMunkaidos.includes(v)) {
      return "8 órás munkaidőnél csak teljes munkaidős foglalkozási viszony választható";
    }
  }

  if (field === "munkaido_napi_ora" && v) {
    const foglViszony = currentForm.foglalkozasi_viszony;
    const teljesMunkaidos = ["01", "05", "41"];
    if (foglViszony && v !== "8" && teljesMunkaidos.includes(foglViszony)) {
      return "Teljes munkaidős foglalkozási viszonynál csak 8 órás munkaidő választható";
    }
    if (foglViszony && v === "8" && !teljesMunkaidos.includes(foglViszony)) {
      return "8 órás munkaidőnél csak teljes munkaidős foglalkozási viszony választható";
    }
  }

  return null;
}
