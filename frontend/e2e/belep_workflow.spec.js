import { expect, test } from '@playwright/test';

const API_URL = 'http://localhost:8744';
const ADMIN_USER = 'admin';
const PV_USER = 'pv_test';
const PAYROLL_USER = 'bsz_test';
const OTHER_PV_USER = 'pv_other_test';

let primaryCostCenter;
let otherCostCenter;
let submittedEntryId;
let submittedTaxId;
let otherPvTaxId;

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function apiLogin(request, username) {
  const res = await request.post(`${API_URL}/auth/login`, { data: { username } });
  expect(res.ok(), `login failed for ${username}`).toBeTruthy();
  return res.json();
}

async function ensureCostCenter(request, adminToken, code, name) {
  const listRes = await request.get(`${API_URL}/admin/cost-centers/`, {
    headers: authHeaders(adminToken),
  });
  expect(listRes.ok()).toBeTruthy();
  const existing = (await listRes.json()).find((cc) => cc.code === code);
  if (existing) return existing;

  const createRes = await request.post(`${API_URL}/admin/cost-centers/`, {
    headers: authHeaders(adminToken),
    data: { code, name },
  });
  expect(createRes.ok()).toBeTruthy();
  return createRes.json();
}

async function ensureUser(request, adminToken, username, role, costCenterIds = []) {
  const listRes = await request.get(`${API_URL}/admin/users/`, {
    headers: authHeaders(adminToken),
  });
  expect(listRes.ok()).toBeTruthy();
  const users = await listRes.json();
  const existing = users.find((user) => user.username === username);
  if (existing) {
    const existingCcIds = existing.cost_centers.map((cc) => cc.id).sort().join(',');
    const targetCcIds = [...costCenterIds].sort().join(',');
    if (existing.role !== role || existingCcIds !== targetCcIds) {
      const patchRes = await request.patch(`${API_URL}/admin/users/${existing.id}`, {
        headers: authHeaders(adminToken),
        data: { role, cost_center_ids: costCenterIds },
      });
      expect(patchRes.ok()).toBeTruthy();
      return patchRes.json();
    }
    return existing;
  }

  const createRes = await request.post(`${API_URL}/admin/users/`, {
    headers: authHeaders(adminToken),
    data: {
      username,
      password: 'Test1234!',
      role,
      cost_center_ids: costCenterIds,
    },
  });
  expect(createRes.ok()).toBeTruthy();
  return createRes.json();
}

function validTaxIdFor19900515(serial) {
  const firstNine = `845059${String(serial).padStart(3, '0')}`;
  const check = [...firstNine].reduce((sum, digit, index) => sum + Number(digit) * (index + 1), 0) % 11;
  if (check === 10) return validTaxIdFor19900515(serial + 1);
  return `${firstNine}${check}`;
}

function entryFormData(taxId) {
  return {
    vezeteknev: 'Teszt',
    keresztnev: 'Elek',
    szuletesi_nev: 'Teszt Elek',
    anyja_neve: 'Minta Mária',
    szuletesi_hely: 'Budapest',
    szuletesi_datum: '1990-05-15',
    neme: '1',
    allampolgarsag: 'HU',
    adoazonosito: taxId,
    taj: '123456788',
    jogviszony_kezdete: '2026-06-01',
    munkaido_napi_ora: '8',
    foglalkozasi_viszony: '01',
    berezesi_mod: '1',
    besorolasi_ber: '300000',
    regio: 'BUDAPEST',
    egyseg: 'NAGY_MFG',
    munkakor: 'OPERATOR',
    feor: '4112',
    koltseghelyKod: 'KLBNAG',
    bankszamlaszam: '12345678-12345678',
    kedvezmenyezett_neve: 'Teszt Elek',
    lakcim_orszag: 'HU',
    lakcim_iranyitoszam: '1011',
    lakcim_telepules: 'Budapest',
    kozterulet: 'Fő',
    lakcim_kozterulet_jellege: 'utca',
    lakcim_hazszam: '1',
  };
}

async function loginUi(page, username, password = 'Test1234!') {
  await page.goto('/login');
  await page.locator('input').first().fill(username);
  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.count()) {
    await passwordInput.fill(password);
  }
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);
}

async function logoutUi(page) {
  await page.getByText('Kilépés').click();
  await expect(page).toHaveURL(/\/login$/);
}

async function selectReactOption(page, field, searchText = '') {
  const input = page.locator(`#${field}`);
  await input.click();
  if (searchText) await input.fill(searchText);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
}

async function fillNewEntryForm(page, taxId) {
  await page.locator('input[name="vezeteknev"]').fill('Teszt');
  await page.locator('input[name="vezeteknev"]').blur();
  await expect(page).toHaveURL(/\/belepok\/\d+$/);

  await page.locator('input[name="keresztnev"]').fill('Elek');
  await page.locator('input[name="szuletesi_nev"]').fill('Teszt Elek');
  await page.locator('input[name="anyja_neve"]').fill('Minta Mária');
  await page.locator('input[name="szuletesi_hely"]').fill('Budapest');
  await page.locator('input[name="szuletesi_datum"]').fill('1990-05-15');
  await selectReactOption(page, 'neme', 'F');
  await selectReactOption(page, 'allampolgarsag', 'Magyar');
  await page.locator('input[name="adoazonosito"]').fill(taxId);
  await page.locator('input[name="taj"]').fill('123456788');
  await selectReactOption(page, 'lakcim_orszag', 'Magyarország');
  await selectReactOption(page, 'lakcim_iranyitoszam', '1011');
  await expect(page.locator('input[name="lakcim_telepules"]')).toHaveValue(/Budapest/);
  await page.locator('input[name="kozterulet"]').fill('Fő');
  await selectReactOption(page, 'lakcim_kozterulet_jellege', 'utca');
  await page.locator('input[name="lakcim_hazszam"]').fill('1');
  await page.locator('input[name="jogviszony_kezdete"]').fill('2026-06-01');
  await selectReactOption(page, 'munkaido_napi_ora', '8');
  await selectReactOption(page, 'foglalkozasi_viszony', 'Teljes');
  await selectReactOption(page, 'berezesi_mod', 'Havi');
  await page.locator('input[name="besorolasi_ber"]').fill('300000');
  await selectReactOption(page, 'regio', 'Budapest');
  await selectReactOption(page, 'egyseg');
  await selectReactOption(page, 'munkakor');
  await selectReactOption(page, 'feor', '4112');
  await selectReactOption(page, 'koltseghelyKod', 'KLBNAG');
  await page.locator('input[name="bankszamlaszam"]').fill('12345678-12345678');
  await page.locator('input[name="kedvezmenyezett_neve"]').fill('Teszt Elek');
  await page.waitForTimeout(2000); // autosave debounce (1500ms) + buffer
}

async function createSubmittedEntryByApi(request, username, costCenterId, taxId) {
  const login = await apiLogin(request, username);
  const token = login.access_token;
  const createRes = await request.post(`${API_URL}/entries/`, {
    headers: authHeaders(token),
    data: { record_type: 'belep', cost_center_id: costCenterId },
  });
  expect(createRes.ok()).toBeTruthy();
  const entry = await createRes.json();

  const patchRes = await request.patch(`${API_URL}/entries/${entry.id}`, {
    headers: authHeaders(token),
    data: { form_data: entryFormData(taxId) },
  });
  expect(patchRes.ok()).toBeTruthy();

  const submitRes = await request.post(`${API_URL}/entries/${entry.id}/submit`, {
    headers: authHeaders(token),
  });
  expect(submitRes.ok()).toBeTruthy();
  return submitRes.json();
}

test.describe.serial('belépő workflow', () => {
  test.beforeAll(async ({ request }) => {
    const adminLogin = await apiLogin(request, ADMIN_USER);
    const adminToken = adminLogin.access_token;
    primaryCostCenter = await ensureCostCenter(request, adminToken, 'KLBNAG', 'Nagy Manufacturing Hungary Kft.');
    otherCostCenter = await ensureCostCenter(request, adminToken, 'E2EOTHER', 'E2E másik költséghely');
    await ensureUser(request, adminToken, PV_USER, 'pv', [primaryCostCenter.id]);
    await ensureUser(request, adminToken, PAYROLL_USER, 'berszamfejto');
    await ensureUser(request, adminToken, OTHER_PV_USER, 'pv', [otherCostCenter.id]);
  });

  test('TC-01: PV bejelentkezés', async ({ page }) => {
    await loginUi(page, PV_USER);
    await expect(page.getByText('Belépők', { exact: true })).toBeVisible();
  });

  test('TC-02: PV új belépő létrehozása és elküldése', async ({ page, request }) => {
    submittedTaxId = validTaxIdFor19900515(Date.now() % 900);
    await loginUi(page, PV_USER);
    await page.goto('/belepok/uj');
    await fillNewEntryForm(page, submittedTaxId);
    submittedEntryId = Number(page.url().match(/\/belepok\/(\d+)/)?.[1]);

    // Explicit PATCH - guarantees every field is present in form_data.
    const pvLogin = await apiLogin(request, PV_USER);
    const pvToken = pvLogin.access_token;
    const patchRes = await request.patch(`${API_URL}/entries/${submittedEntryId}`, {
      headers: authHeaders(pvToken),
      data: { form_data: entryFormData(submittedTaxId) },
    });
    expect(patchRes.ok()).toBeTruthy();

    await page.goto(`/belepok/${submittedEntryId}`);
    await expect(page.locator('input[name="vezeteknev"]')).toHaveValue('Teszt');
    await expect(page.locator('input[name="adoazonosito"]')).toHaveValue(submittedTaxId);

    await page.getByText('Elküldés bérszámfejtőnek').click();
    await expect(page.locator('div.Toastify__toast--warning')).toHaveCount(0);
    await expect(page).toHaveURL(/\/belepok\/folyamatban$/);
    await expect(page.getByText(submittedTaxId)).toBeVisible();
    await expect(page.locator('tr', { hasText: submittedTaxId })).toContainText('Elküldve');
  });

  test('TC-03: Elküldés után a form read-only', async ({ page }) => {
    await loginUi(page, PV_USER);
    await page.goto(`/belepok/${submittedEntryId}`);
    await expect(page.getByText(/már el lett küldve/)).toBeVisible();
    await expect(page.getByText('Elküldés bérszámfejtőnek')).toHaveCount(0);
    await expect(page.locator('input[name="vezeteknev"]')).toHaveAttribute('readonly', '');
  });

  test('TC-04: Bérszámfejtő bejelentkezés és rekord láthatósága', async ({ page }) => {
    await loginUi(page, PV_USER);
    await logoutUi(page);
    await loginUi(page, PAYROLL_USER);
    await page.goto('/berszamfejtes/feldolgozas');
    await expect(page.getByText('Feldolgozásra váró rekordok')).toBeVisible();
    await expect(page.getByText(submittedTaxId)).toBeVisible();
  });

  test('TC-05: CSV letöltés és státuszváltás', async ({ page }) => {
    await loginUi(page, PAYROLL_USER);
    await page.goto('/berszamfejtes/feldolgozas');
    const row = page.locator('tr', { hasText: submittedTaxId });
    await row.getByText('CSV letöltése').click();
    await expect(page.locator('div.Toastify__toast')).toContainText('CSV sikeresen letöltve', { timeout: 10000 });
    await expect(page.locator('tr', { hasText: `#${submittedEntryId}` })).toContainText('CSV letöltve', { timeout: 10000 });
  });

  test('TC-06: PV nem látja más PV rekordjait', async ({ request, page }) => {
    otherPvTaxId = validTaxIdFor19900515((Date.now() + 100) % 900);
    await createSubmittedEntryByApi(request, OTHER_PV_USER, otherCostCenter.id, otherPvTaxId);
    await loginUi(page, PV_USER);
    await page.goto('/belepok/folyamatban');
    await expect(page.getByText(otherPvTaxId)).toHaveCount(0);
  });

  test('TC-07: Küldés gomb disabled ha kötelező mezők hiányoznak', async ({ page }) => {
    await loginUi(page, PV_USER);
    await page.goto('/belepok/uj');
    await expect(page.getByText('Elküldés bérszámfejtőnek')).toBeDisabled();
  });

  test('TC-08: Bérszámfejtő nem tud új belépőt rögzíteni', async ({ page }) => {
    await loginUi(page, PAYROLL_USER);
    await page.goto('/belepok/uj');
    await expect(page).not.toHaveURL(/\/belepok\/uj$/);
    await expect(page.getByText('Elküldés bérszámfejtőnek')).toHaveCount(0);
  });
});
