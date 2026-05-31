# ARCHIVALT MIGRACIOS SCRIPT - NE FUTTASD
#
# Ez a script a regi user_cost_centers tabla -> region mezo migraciohoz keszult.
# A seed.py ma mar elvegzi az auto-migrationt (person_id es region oszlopok).
# A DROP TABLE user_cost_centers muveletet a seed.py kezeli szukseg eseten.
#
# Ha megis szukseg lenne erre a migraciora, futtasd a seed.py-t:
#   cd backend && py seed.py

print("migrate_region.py archivalt. Hasznald a seed.py-t.")
