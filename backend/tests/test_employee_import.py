import os
import sys
from datetime import date
from io import BytesIO
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite://"

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import openpyxl
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.employee import Employee
from app.services.employee_import import import_employees_from_xlsx


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


def make_xlsx(rows: list[list[object]]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Szemely", "Szemely", "Szemely", "Szemely", "Szemely"])
    ws.append(["Adóazonosító jel", "Családi név", "Utónév", "Születési idő", "TAJ szám"])
    for row in rows:
        ws.append(row)

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def test_import_single_new_employee(db_session):
    result = import_employees_from_xlsx(
        make_xlsx([["1234567890", "Teszt", "Elek", "1985-06-15", None]]),
        db_session,
    )

    assert result.created == 1
    assert result.updated == 0
    assert result.skipped == 0


def test_import_duplicate_tax_id_same_import_counts_once(db_session):
    result = import_employees_from_xlsx(
        make_xlsx(
            [
                ["1234567890", "Teszt", "Elek", None, None],
                ["1234567890", "Teszt", "Elek", None, "123-456-789"],
                ["1234567890", "Teszt", "Elek", None, None],
            ]
        ),
        db_session,
    )

    assert result.created == 1
    assert result.updated == 0
    assert result.skipped == 0


def test_import_existing_employee_counts_as_updated(db_session):
    db_session.add(Employee(tax_id="1234567890", last_name="Regi", first_name="Nev"))
    db_session.commit()

    result = import_employees_from_xlsx(
        make_xlsx([["1234567890", "Uj", "Nev", None, None]]),
        db_session,
    )

    assert result.created == 0
    assert result.updated == 1
    assert result.skipped == 0


def test_import_partial_row_preserves_birth_date(db_session):
    result = import_employees_from_xlsx(
        make_xlsx(
            [
                ["1234567890", "Teszt", "Elek", "1985-06-15", None],
                ["1234567890", None, None, None, "123456789"],
            ]
        ),
        db_session,
    )

    employee = db_session.query(Employee).filter(Employee.tax_id == "1234567890").one()
    assert result.created == 1
    assert result.updated == 0
    assert result.skipped == 0
    assert employee.birth_date == date(1985, 6, 15)


def test_import_partial_row_without_name_not_skipped_if_existing(db_session):
    result = import_employees_from_xlsx(
        make_xlsx(
            [
                ["1234567890", "Teszt", "Elek", None, None],
                ["1234567890", None, None, None, "123456789"],
            ]
        ),
        db_session,
    )

    employee = db_session.query(Employee).filter(Employee.tax_id == "1234567890").one()
    assert result.created == 1
    assert result.updated == 0
    assert result.skipped == 0
    assert employee.taj == "123456789"


def test_import_new_employee_missing_name_is_skipped(db_session):
    result = import_employees_from_xlsx(
        make_xlsx([["1234567890", None, "Elek", None, None]]),
        db_session,
    )

    assert result.created == 0
    assert result.updated == 0
    assert result.skipped == 1
    assert any("Sor 3" in error for error in result.errors)
