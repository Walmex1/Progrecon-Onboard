export const NEME_OPTIONS = [
  { value: "1", label: "Férfi" },
  { value: "2", label: "Nő" },
];

export const FOGLALKOZASI_VISZONY = [
  { value: "01", label: "Teljes munkaidős" },
  { value: "02", label: "Részmunkaidős" },
  { value: "04", label: "Részmunkaidős nyugdíjas" },
  { value: "05", label: "Teljes munkaidős nyugdíjas" },
  { value: "41", label: "GYED melletti teljes munkaidős" },
  { value: "42", label: "GYED melletti részmunkaidős" },
];

export const TELJES_MUNKAIDOS = ["01", "05", "41"];

export const BEREZESI_MOD = [
  { value: "1", label: "Havi béres" },
  { value: "4", label: "Órabéres" },
  { value: "5", label: "Teljesítménybéres havi béres" },
  { value: "6", label: "Teljesítménybéres órabéres" },
];

export const SZEP_KIBOCSATO = [
  { value: "3", label: "OTP Bank" },
  { value: "2", label: "MKB Bank" },
  { value: "1", label: "K&H Bank" },
];

export const MUNKAIDО_OPTIONS = [
  { value: "1", label: "1 óra" },
  { value: "2", label: "2 óra" },
  { value: "3", label: "3 óra" },
  { value: "4", label: "4 óra" },
  { value: "5", label: "5 óra" },
  { value: "6", label: "6 óra" },
  { value: "7", label: "7 óra" },
  { value: "8", label: "8 óra" },
];

export const KOZTERULET_JELLEGE_OPTIONS = [
  { value: "utca", label: "utca" },
  { value: "körút", label: "körút" },
  { value: "lépcső", label: "lépcső" },
  { value: "lakótelep", label: "lakótelep" },
  { value: "park", label: "park" },
  { value: "part", label: "part" },
  { value: "kertalja", label: "kertalja" },
  { value: "körtér", label: "körtér" },
  { value: "köz", label: "köz" },
  { value: "út", label: "út" },
  { value: "útja", label: "útja" },
  { value: "telep", label: "telep" },
  { value: "telek", label: "telek" },
  { value: "udvar", label: "udvar" },
  { value: "sugárút", label: "sugárút" },
];

// ── Nexon szótárak (placeholder — végleges kódok még hiányoznak) ─────────────

export const ALLAMPOLGARSAG_OPTIONS = [
  { value: "HU", label: "Magyar" },
  { value: "SK", label: "Szlovák" },
  { value: "RO", label: "Román" },
  { value: "UA", label: "Ukrán" },
  { value: "RS", label: "Szerb" },
  { value: "HR", label: "Horvát" },
  { value: "AT", label: "Osztrák" },
  { value: "DE", label: "Német" },
  { value: "PL", label: "Lengyel" },
  { value: "OTHER", label: "Egyéb" },
];

export const ORSZAG_OPTIONS = [
  { value: "HU", label: "Magyarország" },
  { value: "SK", label: "Szlovákia" },
  { value: "RO", label: "Románia" },
  { value: "UA", label: "Ukrajna" },
  { value: "RS", label: "Szerbia" },
  { value: "HR", label: "Horvátország" },
  { value: "AT", label: "Ausztria" },
  { value: "DE", label: "Németország" },
  { value: "PL", label: "Lengyelország" },
  { value: "GB", label: "Egyesült Királyság" },
  { value: "FR", label: "Franciaország" },
  { value: "IT", label: "Olaszország" },
  { value: "NL", label: "Hollandia" },
  { value: "OTHER", label: "Egyéb" },
];

export const REGIO_OPTIONS = [
  { value: "NYIREGYHAZA", label: "Nyíregyháza" },
  { value: "DEBRECEN", label: "Debrecen" },
  { value: "SZEGED", label: "Szeged" },
  { value: "BUDAPEST", label: "Budapest" },
  { value: "BEKESCSABA", label: "Békéscsaba" },
  { value: "PECS", label: "Pécs" },
  { value: "ZALAEGERSZEG", label: "Zalaegerszeg" },
  { value: "KECSKEMET", label: "Kecskemét" },
  { value: "MISKOLC", label: "Miskolc" },
];

export const EGYSEG_OPTIONS = [
  { value: "LENOVO", label: "Lenovo" },
  { value: "GIANT", label: "Giant" },
  { value: "EGYEB1", label: "Egyéb egység 1 (placeholder)" },
  { value: "EGYEB2", label: "Egyéb egység 2 (placeholder)" },
];

export const MUNKAKOR_OPTIONS = [
  { value: "BERSZ", label: "Bérszámfejtő" },
  { value: "KOMISSIOZO", label: "Komissiózó" },
  { value: "RAKODOMUNKÁS", label: "Rakodómunkás" },
  { value: "TELEPHELYVEZ", label: "Telephelyvezető" },
  { value: "OPERATOR", label: "Operátor" },
  { value: "QUALITY", label: "Quality inspector" },
];

export const FEOR_OPTIONS = [
  { value: "4112", label: "4112 — Irodai alkalmazott" },
  { value: "4190", label: "4190 — Egyéb irodai foglalkozás" },
  { value: "7220", label: "7220 — Rakodómunkás" },
  { value: "7221", label: "7221 — Raktáros" },
  { value: "7222", label: "7222 — Komissiózó" },
  { value: "7410", label: "7410 — Gépkezelő" },
  { value: "7411", label: "7411 — Operátor" },
  { value: "7412", label: "7412 — Minőségellenőr" },
  { value: "1319", label: "1319 — Telephelyvezető" },
  { value: "3411", label: "3411 — Bérszámfejtő" },
  { value: "9999", label: "9999 — Egyéb (placeholder)" },
];

export const KOLTSEGHELYAZ_OPTIONS = [
  { value: "KLBLENU", label: "KLBLENU — Lenovo" },
  { value: "KLBLENV", label: "KLBLENV — Lenovo V" },
  { value: "KLBLUM", label: "KLBLUM — Lenovo UM" },
  { value: "KLBGIANT", label: "KLBGIANT — Giant" },
  { value: "KLBKONT", label: "KLBKONT — Kontír" },
  { value: "KLGBDO", label: "KLGBDO — GBD Office" },
];
