# Egyszeri migracio: users.cost_center_id -> user_cost_centers
# Futtatas: py migrate_cost_centers.py (a backend\ mappabol)

import os
import sys

from sqlalchemy import text

sys.path.append(os.path.dirname(__file__))

from app.database import SessionLocal, Base, engine
from app.models.user_cost_center import UserCostCenter

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

try:
    rows = db.execute(
        text(
            """
            SELECT id, cost_center_id
            FROM users
            WHERE cost_center_id IS NOT NULL
            """
        )
    ).all()

    migrated_count = 0
    for user_id, cost_center_id in rows:
        existing = db.get(
            UserCostCenter,
            {"user_id": user_id, "cost_center_id": cost_center_id},
        )
        if existing:
            continue

        db.add(UserCostCenter(user_id=user_id, cost_center_id=cost_center_id))
        migrated_count += 1

    db.commit()
    print(f"Atmigralt user_cost_centers rekordok szama: {migrated_count}")
finally:
    db.close()
