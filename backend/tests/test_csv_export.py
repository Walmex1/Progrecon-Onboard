import io
import os
import sys
import zipfile
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite://"

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database import Base, get_db
from app.main import app
from app.models.cost_center import CostCenter
from app.models.employee import Employee
from app.models.entry_record import EntryRecord
from app.models.user import User
from app.services.csv_generator import generate_nb_torzs

# adoazonosito "8432640018" → szuletesi_datum "1985-06-15"
# TAJ "123456788" — checksum verified
# bankszamlaszam "12345678-12345678" → 16 digits after strip
VALID_FORM_DATA = {
    # Személyes adatok
    "vezeteknev": "Teszt",
    "keresztnev": "Elek",
    "szuletesi_nev": "Teszt Elek",
    "anyja_neve": "Minta Mária",
    "szuletesi_hely": "Budapest",
    "szuletesi_datum": "1985-06-15",
    "neme": "1",
    "allampolgarsag": "HU",
    "adoazonosito": "8432640018",
    "taj": "123456788",
    # Lakcím
    "lakcim_orszag": "HU",
    "lakcim_iranyitoszam": "1234",
    "lakcim_telepules": "Budapest",
    "kozterulet": "Fő utca",
    "lakcim_kozterulet_jellege": "utca",
    "lakcim_hazszam": "1",
    # Jogviszony
    "jogviszony_kezdete": "2024-01-01",
    "munkaido_napi_ora": "8",
    "foglalkozasi_viszony": "01",
    "berezesi_mod": "1",
    "besorolasi_ber": "500000",
    # Munkakör és besorolás
    "regio": "Észak",
    "egyseg": "CC-001",
    "munkakor": "OPERATOR",
    "feor": "9999",
    "koltseghelyKod": "CC-001",
    # Bankszámla
    "bankszamlaszam": "12345678-12345678",
    "kedvezmenyezett_neve": "Teszt Elek",
}


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


def create_cost_center(db_session, code: str, region: str = "\u00c9szak") -> CostCenter:
    cc = CostCenter(code=code, name=f"Cost center {code}", region=region)
    db_session.add(cc)
    db_session.flush()
    return cc


def create_pv_user(db_session, username: str, cost_center: CostCenter) -> User:
    user = User(username=username, password_hash="test", role="pv", region=cost_center.region)
    db_session.add(user)
    db_session.flush()
    return user


def create_berszamfejto_user(db_session, username: str) -> User:
    user = User(username=username, password_hash="test", role="berszamfejto")
    db_session.add(user)
    db_session.flush()
    return user


def create_elkuldve_entry(db_session, user: User, cost_center: CostCenter, form_data: dict) -> EntryRecord:
    entry = EntryRecord(
        record_type="belep",
        status="elküldve",
        created_by=user.id,
        cost_center_id=cost_center.id,
        form_data=form_data,
    )
    db_session.add(entry)
    db_session.commit()
    db_session.refresh(entry)
    return entry


# --- PO-02/001 + PO-05/001 ---

def test_export_generator_produces_correct_column_count():
    row = generate_nb_torzs(VALID_FORM_DATA)
    assert len(row) == 168


# --- PO-05/001 + PO-06/002 ---

def test_export_valid_entry_returns_zip(client, db_session):
    cc = create_cost_center(db_session, "CC-EXP-001")
    pv = create_pv_user(db_session, "pv_exp_001", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_exp_001")
    db_session.commit()
    entry = create_elkuldve_entry(db_session, pv, cc, VALID_FORM_DATA)

    response = client.post(f"/exports/{entry.id}", headers=auth_headers(bsz))

    assert response.status_code == 200
    assert "application/zip" in response.headers["content-type"]

    zip_buffer = io.BytesIO(response.content)
    with zipfile.ZipFile(zip_buffer) as zf:
        names = zf.namelist()
    assert "NBTorzs.csv" in names
    assert "NBJuttat.csv" in names
    assert "NBLevon.csv" in names

    db_session.refresh(entry)
    assert entry.status == "csv_letöltve"


def test_export_sets_status_via_transition(client, db_session):
    cc = create_cost_center(db_session, "CC-EXP-002")
    pv = create_pv_user(db_session, "pv_exp_002", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_exp_002")
    db_session.commit()

    entry = create_elkuldve_entry(db_session, pv, cc, VALID_FORM_DATA)
    client.post(f"/exports/{entry.id}", headers=auth_headers(bsz))
    db_session.refresh(entry)
    assert entry.status == "csv_letöltve"

    folyamatban_entry = EntryRecord(
        record_type="belep",
        status="folyamatban",
        created_by=pv.id,
        cost_center_id=cc.id,
        form_data=VALID_FORM_DATA,
    )
    db_session.add(folyamatban_entry)
    db_session.commit()
    db_session.refresh(folyamatban_entry)

    response = client.post(f"/exports/{folyamatban_entry.id}", headers=auth_headers(bsz))
    assert response.status_code == 400


# --- PO-02/002 ---

def test_export_missing_required_field_returns_400(client, db_session):
    cc = create_cost_center(db_session, "CC-EXP-003")
    pv = create_pv_user(db_session, "pv_exp_003", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_exp_003")
    db_session.commit()

    form_data_missing_vezeteknev = {k: v for k, v in VALID_FORM_DATA.items() if k != "vezeteknev"}
    entry = create_elkuldve_entry(db_session, pv, cc, form_data_missing_vezeteknev)

    response = client.post(f"/exports/{entry.id}", headers=auth_headers(bsz))

    assert response.status_code == 400
    body = response.json()
    assert "validation_errors" in body["detail"]
    fields_with_errors = [e["field"] for e in body["detail"]["validation_errors"]]
    assert "vezeteknev" in fields_with_errors


# --- PO-05/004 ---

def test_close_duplicate_belep_returns_409(client, db_session):
    cc = create_cost_center(db_session, "CC-EXP-004")
    pv = create_pv_user(db_session, "pv_exp_004", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_exp_004")

    existing_employee = Employee(
        tax_id="8432640018",
        last_name="Meglevo",
        first_name="Dolgozo",
        cost_center_id=None,
    )
    db_session.add(existing_employee)
    db_session.commit()

    entry = EntryRecord(
        record_type="belep",
        status="csv_letöltve",
        created_by=pv.id,
        cost_center_id=cc.id,
        form_data={"adoazonosito": "8432640018"},
    )
    db_session.add(entry)
    db_session.commit()
    db_session.refresh(entry)

    response = client.post(f"/entries/{entry.id}/close", headers=auth_headers(bsz))

    assert response.status_code == 409


def test_munkaido_options_only_valid_values():
    """PO-006: frontend MUNKAIDO_OPTIONS csak 2/4/6/8 értékeket tartalmaz"""
    from app.services.csv_generator import MUNKAIDO_SZABALY
    valid_values = {"2", "4", "6", "8"}
    assert set(MUNKAIDO_SZABALY.keys()) == valid_values


def test_munkaido_reszido_fills_csv_cols(db_session):
    """PO-006: részmunkaidő esetén col_108 és col_168 ki van töltve"""
    from app.services.csv_generator import generate_nb_torzs
    for ora, expected_108, expected_168 in [
        ("2", "43.5", "2"),
        ("4", "87", "4"),
        ("6", "130.5", "6"),
    ]:
        form = {**VALID_FORM_DATA, "munkaido_napi_ora": ora}
        row = generate_nb_torzs(form)
        assert row[107] == expected_108, f"{ora} óránál col_108 hibás"
        assert row[167] == expected_168, f"{ora} óránál col_168 hibás"


def test_munkaido_teljes_empty_csv_cols():
    """PO-006: teljes munkaidő (8 óra) esetén col_108 és col_168 üres"""
    from app.services.csv_generator import generate_nb_torzs
    form = {**VALID_FORM_DATA, "munkaido_napi_ora": "8"}
    row = generate_nb_torzs(form)
    assert row[107] == ""
    assert row[167] == ""


def test_validator_rejects_missing_szuletesi_nev(client, db_session):
    """PO-008: szuletesi_nev hiánya export előtt 400-at ad"""
    cc = create_cost_center(db_session, "CC-VAL-001")
    pv = create_pv_user(db_session, "pv_val_001", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_val_001")
    db_session.commit()
    form = {k: v for k, v in VALID_FORM_DATA.items() if k != "szuletesi_nev"}
    entry = create_elkuldve_entry(db_session, pv, cc, form)

    response = client.post(f"/exports/{entry.id}", headers=auth_headers(bsz))

    assert response.status_code == 400
    fields = [e["field"] for e in response.json()["detail"]["validation_errors"]]
    assert "szuletesi_nev" in fields


def test_validator_rejects_missing_foglalkozasi_viszony(client, db_session):
    """PO-008: foglalkozasi_viszony hiánya export előtt 400-at ad"""
    cc = create_cost_center(db_session, "CC-VAL-002")
    pv = create_pv_user(db_session, "pv_val_002", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_val_002")
    db_session.commit()
    form = {k: v for k, v in VALID_FORM_DATA.items() if k != "foglalkozasi_viszony"}
    entry = create_elkuldve_entry(db_session, pv, cc, form)

    response = client.post(f"/exports/{entry.id}", headers=auth_headers(bsz))

    assert response.status_code == 400
    fields = [e["field"] for e in response.json()["detail"]["validation_errors"]]
    assert "foglalkozasi_viszony" in fields


def test_validator_rejects_missing_koltseghelykod(client, db_session):
    """PO-008: koltseghelyKod hiánya export előtt 400-at ad"""
    cc = create_cost_center(db_session, "CC-VAL-003")
    pv = create_pv_user(db_session, "pv_val_003", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_val_003")
    db_session.commit()
    form = {k: v for k, v in VALID_FORM_DATA.items() if k != "koltseghelyKod"}
    entry = create_elkuldve_entry(db_session, pv, cc, form)

    response = client.post(f"/exports/{entry.id}", headers=auth_headers(bsz))

    assert response.status_code == 400
    fields = [e["field"] for e in response.json()["detail"]["validation_errors"]]
    assert "koltseghelyKod" in fields


def test_close_without_adoazonosito_returns_400(client, db_session):
    """PO-019: adóazonosító nélküli lezárás 400-at ad, státusz nem változik"""
    cc = create_cost_center(db_session, "CC-CLS-001")
    pv = create_pv_user(db_session, "pv_cls_001", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_cls_001")
    db_session.commit()
    entry = EntryRecord(
        record_type="belep",
        status="csv_letöltve",
        created_by=pv.id,
        cost_center_id=cc.id,
        form_data={},
    )
    db_session.add(entry)
    db_session.commit()
    db_session.refresh(entry)

    response = client.post(f"/entries/{entry.id}/close", headers=auth_headers(bsz))

    assert response.status_code == 400
    db_session.refresh(entry)
    assert entry.status == "csv_letöltve"


def test_close_belep_creates_employee_with_full_data(client, db_session):
    """PO-020: lezáráskor az employee rekord tartalmazza a birth_place stb. mezőket"""
    cc = create_cost_center(db_session, "CC-EMP-001")
    pv = create_pv_user(db_session, "pv_emp_001", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_emp_001")
    db_session.commit()
    entry = EntryRecord(
        record_type="belep",
        status="csv_letöltve",
        created_by=pv.id,
        cost_center_id=cc.id,
        form_data=VALID_FORM_DATA,
    )
    db_session.add(entry)
    db_session.commit()
    db_session.refresh(entry)

    response = client.post(f"/entries/{entry.id}/close", headers=auth_headers(bsz))

    assert response.status_code == 200
    emp = db_session.query(Employee).filter(
        Employee.tax_id == VALID_FORM_DATA["adoazonosito"]
    ).first()
    assert emp is not None
    assert emp.birth_place == VALID_FORM_DATA["szuletesi_hely"]
    assert emp.mothers_name == VALID_FORM_DATA["anyja_neve"]
    assert emp.birth_name == VALID_FORM_DATA["szuletesi_nev"]
    assert emp.gender == VALID_FORM_DATA["neme"]


def test_reexport_csv_letoltve_entry_succeeds(client, db_session):
    """PO-004: csv_letöltve státuszú rekord újraexportálható, státusz nem változik"""
    cc = create_cost_center(db_session, "CC-REEXP-001")
    pv = create_pv_user(db_session, "pv_reexp_001", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_reexp_001")
    db_session.commit()

    entry = EntryRecord(
        record_type="belep",
        status="csv_letöltve",
        created_by=pv.id,
        cost_center_id=cc.id,
        form_data=VALID_FORM_DATA,
    )
    db_session.add(entry)
    db_session.commit()
    db_session.refresh(entry)

    response = client.post(f"/exports/{entry.id}", headers=auth_headers(bsz))

    assert response.status_code == 200
    db_session.refresh(entry)
    assert entry.status == "csv_letöltve"


def test_first_export_sets_csv_letoltve(client, db_session):
    """PO-004: első exportnál elküldve -> csv_letöltve státuszváltás megtörténik"""
    cc = create_cost_center(db_session, "CC-REEXP-002")
    pv = create_pv_user(db_session, "pv_reexp_002", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_reexp_002")
    db_session.commit()

    entry = create_elkuldve_entry(db_session, pv, cc, VALID_FORM_DATA)

    response = client.post(f"/exports/{entry.id}", headers=auth_headers(bsz))

    assert response.status_code == 200
    db_session.refresh(entry)
    assert entry.status == "csv_letöltve"


def test_szep_partial_fill_blocks_export(client, db_session):
    """PO-016: részleges SZÉP adat export előtt 400-at ad"""
    cc = create_cost_center(db_session, "CC-SZEP-001")
    pv = create_pv_user(db_session, "pv_szep_001", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_szep_001")
    db_session.commit()

    form = {
        **VALID_FORM_DATA,
        "szep_kartya_szam": "12345678-12345678-12345678",
    }
    entry = create_elkuldve_entry(db_session, pv, cc, form)

    response = client.post(f"/exports/{entry.id}", headers=auth_headers(bsz))

    assert response.status_code == 400
    fields = [e["field"] for e in response.json()["detail"]["validation_errors"]]
    assert "szep_kartya_kibocsato" in fields
    assert "szep_kedvezmenyezett" in fields


def test_payroll_done_excludes_folyamatban(client, db_session):
    """PO-018: GET /entries/ folyamatban rekord nem kerül a done listába"""
    cc = create_cost_center(db_session, "CC-PAY-001")
    pv = create_pv_user(db_session, "pv_pay_001", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_pay_001")
    db_session.commit()

    folyamatban_entry = EntryRecord(
        record_type="belep",
        status="folyamatban",
        created_by=pv.id,
        cost_center_id=cc.id,
        form_data={},
    )
    csv_letoltve_entry = EntryRecord(
        record_type="belep",
        status="csv_letöltve",
        created_by=pv.id,
        cost_center_id=cc.id,
        form_data={},
    )
    db_session.add_all([folyamatban_entry, csv_letoltve_entry])
    db_session.commit()

    response = client.get("/entries/", params={"record_type": "belep"}, headers=auth_headers(bsz))

    assert response.status_code == 200
    statuses = [e["status"] for e in response.json()]
    assert "folyamatban" not in statuses
    assert "csv_letöltve" in statuses


def test_munkaido_foglviszony_cross_validation_backend(client, db_session):
    """PO-030: 8 óra + részmunkaidős foglalkozási viszony export előtt 400-at ad"""
    cc = create_cost_center(db_session, "CC-VAL-010")
    pv = create_pv_user(db_session, "pv_val_010", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_val_010")
    db_session.commit()

    form = {**VALID_FORM_DATA, "munkaido_napi_ora": "8", "foglalkozasi_viszony": "02"}
    entry = create_elkuldve_entry(db_session, pv, cc, form)

    response = client.post(f"/exports/{entry.id}", headers=auth_headers(bsz))

    assert response.status_code == 400
    fields = [e["field"] for e in response.json()["detail"]["validation_errors"]]
    assert "foglalkozasi_viszony" in fields


def test_reszido_teljes_munkaidos_cross_validation_backend(client, db_session):
    """PO-030: részmunkaidő (4 óra) + teljes munkaidős foglalkozási viszony 400-at ad"""
    cc = create_cost_center(db_session, "CC-VAL-011")
    pv = create_pv_user(db_session, "pv_val_011", cc)
    bsz = create_berszamfejto_user(db_session, "bsz_val_011")
    db_session.commit()

    form = {**VALID_FORM_DATA, "munkaido_napi_ora": "4", "foglalkozasi_viszony": "01"}
    entry = create_elkuldve_entry(db_session, pv, cc, form)

    response = client.post(f"/exports/{entry.id}", headers=auth_headers(bsz))

    assert response.status_code == 400
    fields = [e["field"] for e in response.json()["detail"]["validation_errors"]]
    assert "foglalkozasi_viszony" in fields


def test_parse_date_utility():
    """PO-028: parse_date utils modul helyesen működik mindkét korábbi use case-re"""
    from app.utils.date_utils import parse_date
    from datetime import date, datetime

    assert parse_date("1985-06-15") == date(1985, 6, 15)
    assert parse_date(datetime(1985, 6, 15, 10, 0)) == date(1985, 6, 15)
    assert parse_date(date(1985, 6, 15)) == date(1985, 6, 15)
    assert parse_date("1985.06.15") == date(1985, 6, 15)
    assert parse_date(None) is None
    assert parse_date("nem-datum") is None


def test_entry_service_uses_shared_parse_date():
    """PO-028: entry_service _parse_date az utils modulból jön"""
    import app.services.entry_service as es
    import app.utils.date_utils as du

    assert es._parse_date is du.parse_date


def test_employee_import_uses_shared_parse_date():
    """PO-028: employee_import _parse_date az utils modulból jön"""
    import app.services.employee_import as ei
    import app.utils.date_utils as du

    assert ei._parse_date is du.parse_date
