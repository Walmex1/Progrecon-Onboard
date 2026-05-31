# Valós adatok seed-je — újrafuttatható (get_or_create logika)
# Futtatás: python seed.py (a backend\ mappából, venv aktiválva)

import sys
import os
sys.path.append(os.path.dirname(__file__))

from sqlalchemy import text, inspect as sa_inspect
from app.database import SessionLocal, Base, engine
from app.models.person import Person
from app.models.user import User
from app.models.cost_center import CostCenter
from app.core.security import hash_password

import app.models.person
import app.models.user
import app.models.cost_center
import app.models.employee
import app.models.entry_record
import app.models.csv_export
import app.models.nav_upload
import app.models.audit_log

Base.metadata.create_all(bind=engine)

# Migration: person_id hozzáadása, ha még nem létezik
_inspector = sa_inspect(engine)
_user_cols = [col["name"] for col in _inspector.get_columns("users")]
if "person_id" not in _user_cols:
    with engine.connect() as _conn:
        _conn.execute(text("ALTER TABLE users ADD COLUMN person_id INTEGER REFERENCES persons(id)"))
        _conn.commit()
    print("Migration: users.person_id oszlop hozzáadva")

if "region" not in _user_cols:
    with engine.connect() as _conn:
        _conn.execute(text("ALTER TABLE users ADD COLUMN region TEXT"))
        _conn.commit()
    print("Migration: users.region oszlop hozzáadva")

_cc_cols = [col["name"] for col in _inspector.get_columns("cost_centers")]
if "region" not in _cc_cols:
    with engine.connect() as _conn:
        _conn.execute(text("ALTER TABLE cost_centers ADD COLUMN region TEXT"))
        _conn.commit()
    print("Migration: cost_centers.region oszlop hozzáadva")

db = SessionLocal()


def get_or_create_cc(db, code, name, region=None):
    cc = db.query(CostCenter).filter(CostCenter.code == code).first()
    if not cc:
        cc = CostCenter(code=code, name=name, region=region)
        db.add(cc)
    elif region and not cc.region:
        cc.region = region
    return cc


def get_or_create_person(last_name, first_name, email):
    person = db.query(Person).filter(Person.email == email).first()
    if not person:
        person = Person(last_name=last_name, first_name=first_name, email=email)
        db.add(person)
        db.flush()
    return person


def get_or_create_user(username, password, role, person_id=None, region=None):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        user = User(
            username=username,
            password_hash=hash_password(password),
            role=role,
            person_id=person_id,
            region=region,
        )
        db.add(user)
        db.flush()
    elif person_id and not user.person_id:
        user.person_id = person_id
    if role == "pv" and region and not user.region:
        user.region = region
    return user


# Költséghelyek

# Személyek
person_pv1 = get_or_create_person("Projektvezető", "Egy", "pv1@progrecon.hu")
person_ber1 = get_or_create_person("Bérszámfejtő", "Egy", "ber1@progrecon.hu")
person_ber2 = get_or_create_person("Bérszámfejtő", "Kettő", "ber2@progrecon.hu")
person_admin = get_or_create_person("Adminisztrátor", "Egy", "admin@progrecon.hu")
db.flush()

# Felhasználók
pv1 = get_or_create_user("pv1", "demo1234", "pv", person_pv1.id, "\u00c9szak")
ber1 = get_or_create_user("ber1", "demo1234", "berszamfejto", person_ber1.id)
ber2 = get_or_create_user("ber2", "demo1234", "berszamfejto", person_ber2.id)
admin = get_or_create_user("admin", "admin1234", "admin", person_admin.id)

db.commit()

print("Seed kész!")
print("Felhasználók: pv1 (jelszó: demo1234) | ber1, ber2 (jelszó: demo1234) | admin (jelszó: admin1234)")
