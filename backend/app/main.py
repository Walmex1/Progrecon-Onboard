from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import Base, engine

import app.models.person
import app.models.user
import app.models.cost_center
import app.models.employee
import app.models.entry_record
import app.models.csv_export
import app.models.nav_upload
import app.models.audit_log

from app.routers import auth, entry, export, cost_centers, users, pv_stats, employees
from app.routers.cost_centers import pv_router as cost_centers_pv_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(auth.router)
app.include_router(entry.router)
app.include_router(export.router)
app.include_router(cost_centers_pv_router)
app.include_router(cost_centers.router)
app.include_router(users.router)
app.include_router(pv_stats.router)
app.include_router(employees.router)

@app.get("/")
def root():
    return {"status": "ok", "app": settings.APP_NAME}
