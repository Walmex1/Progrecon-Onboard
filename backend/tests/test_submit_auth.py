import os
import sys
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
from app.models.entry_record import EntryRecord
from app.models.user import User


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
    cost_center = CostCenter(code=code, name=f"Cost center {code}", region=region)
    db_session.add(cost_center)
    db_session.flush()
    return cost_center


def create_pv_user(db_session, username: str, cost_center: CostCenter) -> User:
    user = User(username=username, password_hash="test", role="pv", region=cost_center.region)
    db_session.add(user)
    db_session.flush()
    return user


def create_entry(db_session, user: User, cost_center: CostCenter) -> EntryRecord:
    entry = EntryRecord(
        record_type="belep",
        status="folyamatban",
        created_by=user.id,
        cost_center_id=cost_center.id,
        form_data={},
    )
    db_session.add(entry)
    db_session.commit()
    db_session.refresh(entry)
    return entry


def test_pv_cannot_submit_other_pvs_record_same_cost_center(client, db_session):
    cost_center = create_cost_center(db_session, "CC-001")
    pv_a = create_pv_user(db_session, "pv_a", cost_center)
    pv_b = create_pv_user(db_session, "pv_b", cost_center)
    db_session.commit()
    entry = create_entry(db_session, pv_a, cost_center)

    response = client.post(f"/entries/{entry.id}/submit", headers=auth_headers(pv_b))

    assert response.status_code == 403


def test_pv_can_submit_own_record(client, db_session):
    cost_center = create_cost_center(db_session, "CC-002")
    pv_a = create_pv_user(db_session, "pv_a_own", cost_center)
    db_session.commit()
    entry = create_entry(db_session, pv_a, cost_center)

    response = client.post(f"/entries/{entry.id}/submit", headers=auth_headers(pv_a))

    assert response.status_code == 200
    assert response.json()["status"] == "elk\u00fcldve"


def create_berszamfejto_user(db_session, username: str) -> User:
    user = User(username=username, password_hash="test", role="berszamfejto")
    db_session.add(user)
    db_session.flush()
    return user


def create_admin_user(db_session, username: str) -> User:
    user = User(username=username, password_hash="test", role="admin")
    db_session.add(user)
    db_session.flush()
    return user


def submit_entry(client, entry_id: int, user: User) -> None:
    """Helper: beküld egy rekordot a megadott user nevében."""
    client.post(f"/entries/{entry_id}/submit", headers=auth_headers(user))


def test_pv_cannot_submit_different_cost_center_record(client, db_session):
    cost_center_a = create_cost_center(db_session, "CC-003")
    cost_center_b = create_cost_center(db_session, "CC-004")
    pv_a = create_pv_user(db_session, "pv_a_other_cc", cost_center_a)
    pv_b = create_pv_user(db_session, "pv_b_other_cc", cost_center_b)
    db_session.commit()
    entry = create_entry(db_session, pv_a, cost_center_a)

    response = client.post(f"/entries/{entry.id}/submit", headers=auth_headers(pv_b))

    assert response.status_code == 403


# PO-002 tesztek

def test_pv_cannot_close_entry(client, db_session):
    cost_center = create_cost_center(db_session, "CC-PO002-A")
    pv = create_pv_user(db_session, "pv_close_test", cost_center)
    db_session.commit()
    entry = EntryRecord(
        record_type="belep",
        status="csv_letöltve",
        created_by=pv.id,
        cost_center_id=cost_center.id,
        form_data={},
    )
    db_session.add(entry)
    db_session.commit()
    db_session.refresh(entry)

    response = client.post(f"/entries/{entry.id}/close", headers=auth_headers(pv))

    assert response.status_code == 403


def test_berszamfejto_can_close_entry(client, db_session):
    cost_center = create_cost_center(db_session, "CC-PO002-B")
    pv = create_pv_user(db_session, "pv_for_close", cost_center)
    berszamfejto = create_berszamfejto_user(db_session, "bsz_close_test")
    db_session.commit()
    entry = EntryRecord(
        record_type="belep",
        status="csv_letöltve",
        created_by=pv.id,
        cost_center_id=cost_center.id,
        form_data={"adoazonosito": "8432640018"},
    )
    db_session.add(entry)
    db_session.commit()
    db_session.refresh(entry)

    response = client.post(f"/entries/{entry.id}/close", headers=auth_headers(berszamfejto))

    assert response.status_code == 200
    assert response.json()["status"] == "lezarva"


# PO-003 tesztek

def test_berszamfejto_cannot_list_folyamatban_entries(client, db_session):
    cost_center = create_cost_center(db_session, "CC-PO003-A")
    pv = create_pv_user(db_session, "pv_003_a", cost_center)
    berszamfejto = create_berszamfejto_user(db_session, "bsz_003_list")
    db_session.commit()
    entry = create_entry(db_session, pv, cost_center)

    response = client.get("/entries/", headers=auth_headers(berszamfejto))

    assert response.status_code == 200
    ids = [e["id"] for e in response.json()]
    assert entry.id not in ids


def test_berszamfejto_cannot_get_folyamatban_entry(client, db_session):
    cost_center = create_cost_center(db_session, "CC-PO003-B")
    pv = create_pv_user(db_session, "pv_003_b", cost_center)
    berszamfejto = create_berszamfejto_user(db_session, "bsz_003_get")
    db_session.commit()
    entry = create_entry(db_session, pv, cost_center)

    response = client.get(f"/entries/{entry.id}", headers=auth_headers(berszamfejto))

    assert response.status_code == 403


def test_berszamfejto_can_get_elkuldve_entry(client, db_session):
    cost_center = create_cost_center(db_session, "CC-PO003-C")
    pv = create_pv_user(db_session, "pv_003_c", cost_center)
    berszamfejto = create_berszamfejto_user(db_session, "bsz_003_elkuldve")
    db_session.commit()
    entry = create_entry(db_session, pv, cost_center)
    submit_entry(client, entry.id, pv)

    response = client.get(f"/entries/{entry.id}", headers=auth_headers(berszamfejto))

    assert response.status_code == 200


# PO-004 tesztek

def test_pv_can_get_other_pvs_submitted_record_same_region(client, db_session):
    cost_center = create_cost_center(db_session, "CC-PO004-A")
    pv_a = create_pv_user(db_session, "pv_004_a", cost_center)
    pv_b = create_pv_user(db_session, "pv_004_b", cost_center)
    db_session.commit()
    entry = create_entry(db_session, pv_a, cost_center)
    submit_entry(client, entry.id, pv_a)

    response = client.get(f"/entries/{entry.id}", headers=auth_headers(pv_b))

    assert response.status_code == 200


def test_pv_can_get_own_submitted_record(client, db_session):
    cost_center = create_cost_center(db_session, "CC-PO004-B")
    pv_a = create_pv_user(db_session, "pv_004_own", cost_center)
    db_session.commit()
    entry = create_entry(db_session, pv_a, cost_center)
    submit_entry(client, entry.id, pv_a)

    response = client.get(f"/entries/{entry.id}", headers=auth_headers(pv_a))

    assert response.status_code == 200


# PO-005 tesztek

def test_pv_cannot_patch_elkuldve_entry_without_recall(client, db_session):
    cost_center = create_cost_center(db_session, "CC-PO005-A")
    pv_a = create_pv_user(db_session, "pv_005_a", cost_center)
    db_session.commit()
    entry = create_entry(db_session, pv_a, cost_center)
    submit_entry(client, entry.id, pv_a)

    response = client.patch(
        f"/entries/{entry.id}",
        json={"form_data": {"vezeteknev": "Teszt"}},
        headers=auth_headers(pv_a),
    )

    assert response.status_code == 400


def test_pv_can_patch_folyamatban_entry(client, db_session):
    cost_center = create_cost_center(db_session, "CC-PO005-B")
    pv_a = create_pv_user(db_session, "pv_005_b", cost_center)
    db_session.commit()
    entry = create_entry(db_session, pv_a, cost_center)

    response = client.patch(
        f"/entries/{entry.id}",
        json={"form_data": {"vezeteknev": "Teszt"}},
        headers=auth_headers(pv_a),
    )

    assert response.status_code == 200


def test_pv_can_list_cost_centers(client, db_session):
    """PO-003: PV a /cost-centers/ endpointot eléri, csak saját régióját látja"""
    cc_north = CostCenter(code="CC-NORTH", name="Észak telephely", region="Észak", is_active=True)
    cc_south = CostCenter(code="CC-SOUTH", name="Dél telephely", region="Dél", is_active=True)
    db_session.add_all([cc_north, cc_south])
    pv = User(username="pv_cc_test", password_hash="x", role="pv", region="Észak")
    db_session.add(pv)
    db_session.commit()

    response = client.get("/cost-centers/", headers=auth_headers(pv))

    assert response.status_code == 200
    codes = [cc["code"] for cc in response.json()]
    assert "CC-NORTH" in codes
    assert "CC-SOUTH" not in codes


def test_admin_can_list_all_cost_centers(client, db_session):
    """PO-003: admin a /cost-centers/ endpointon minden aktív cost centert lát"""
    cc_north = CostCenter(code="CC-ADM-N", name="Észak", region="Észak", is_active=True)
    cc_south = CostCenter(code="CC-ADM-S", name="Dél", region="Dél", is_active=True)
    db_session.add_all([cc_north, cc_south])
    admin = create_admin_user(db_session, "admin_cc_test")
    db_session.commit()

    response = client.get("/cost-centers/", headers=auth_headers(admin))

    assert response.status_code == 200
    codes = [cc["code"] for cc in response.json()]
    assert "CC-ADM-N" in codes
    assert "CC-ADM-S" in codes


def test_pv_can_create_draft_without_cost_center(client, db_session):
    """PO-021: PV draft rekordot hozhat létre cost_center_id nélkül"""
    cost_center = create_cost_center(db_session, "CC-DRAFT-A")
    pv = create_pv_user(db_session, "pv_draft_test", cost_center)
    db_session.commit()

    response = client.post(
        "/entries/",
        json={"record_type": "belep", "cost_center_id": None},
        headers=auth_headers(pv),
    )

    assert response.status_code == 201
    assert response.json()["status"] == "folyamatban"
    assert response.json()["cost_center_id"] is None


def test_pv_cannot_access_other_pvs_null_cost_center_draft(client, db_session):
    """PO-021: null cost_center_id draft csak a létrehozó PV-nek érhető el"""
    cost_center = create_cost_center(db_session, "CC-DRAFT-B")
    pv_a = create_pv_user(db_session, "pv_draft_a", cost_center)
    pv_b = create_pv_user(db_session, "pv_draft_b", cost_center)
    db_session.commit()

    create_resp = client.post(
        "/entries/",
        json={"record_type": "belep", "cost_center_id": None},
        headers=auth_headers(pv_a),
    )
    entry_id = create_resp.json()["id"]

    response = client.get(f"/entries/{entry_id}", headers=auth_headers(pv_b))

    assert response.status_code == 403
