import sys, os
sys.path.append(os.path.dirname(__file__))

from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE entry_records_new (
            id INTEGER NOT NULL PRIMARY KEY,
            record_type VARCHAR NOT NULL,
            status VARCHAR NOT NULL,
            employee_id INTEGER REFERENCES employees(id),
            created_by INTEGER NOT NULL REFERENCES users(id),
            cost_center_id INTEGER REFERENCES cost_centers(id),
            form_data JSON NOT NULL,
            created_at DATETIME NOT NULL,
            submitted_at DATETIME,
            updated_at DATETIME NOT NULL
        )
    """))
    conn.execute(text("""
        INSERT INTO entry_records_new SELECT * FROM entry_records
    """))
    conn.execute(text("DROP TABLE entry_records"))
    conn.execute(text("ALTER TABLE entry_records_new RENAME TO entry_records"))
    conn.commit()

print("Migráció kész — cost_center_id mostantól nullable.")
