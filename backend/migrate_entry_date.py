import sqlite3, os
db_path = os.path.join(os.path.dirname(__file__), "progrecon.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("ALTER TABLE employees ADD COLUMN entry_date DATE")
conn.commit()
conn.close()
print("OK: entry_date oszlop hozzáadva")
