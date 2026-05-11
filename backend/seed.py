# Demo felhasználók és költséghelyek létrehozása
# Futtatás: python seed.py (a backend\ mappából, venv aktiválva)

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.user_cost_center import UserCostCenter
from app.models.cost_center import CostCenter
from app.core.security import hash_password

import app.models.user
import app.models.user_cost_center
import app.models.cost_center
import app.models.employee
import app.models.entry_record
import app.models.csv_export
import app.models.nav_upload
import app.models.audit_log

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Költséghelyek
kh1 = CostCenter(code="KH001", name="Demo Ügyfél Kft.")
kh2 = CostCenter(code="KH002", name="Teszt Zrt.")
db.add_all([kh1, kh2])
db.flush()

# Felhasználók
pv1 = User(username="pv1", password_hash=hash_password("demo1234"), role="pv")
pv2 = User(username="pv2", password_hash=hash_password("demo1234"), role="pv")
ber1 = User(username="ber1", password_hash=hash_password("demo1234"), role="berszamfejto")
ber2 = User(username="ber2", password_hash=hash_password("demo1234"), role="berszamfejto")
admin = User(username="admin", password_hash=hash_password("admin1234"), role="admin")
users = [pv1, pv2, ber1, ber2, admin]
db.add_all(users)
db.flush()

db.add_all(
    [
        UserCostCenter(user_id=pv1.id, cost_center_id=kh1.id),
        UserCostCenter(user_id=pv2.id, cost_center_id=kh2.id),
    ]
)
db.commit()

print("Demo adatok sikeresen létrehozva!")
print("Felhasználók: pv1, pv2, ber1, ber2 (jelszó: demo1234) | admin (jelszó: admin1234)")
