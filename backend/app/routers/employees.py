from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.database import get_db
from app.dependencies import require_role
from app.models.employee import Employee
from app.models.cost_center import CostCenter
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeImportResult
from app.services.employee_import import import_employees_from_xlsx

router = APIRouter(prefix="/admin/employees", tags=["employees"])


def _enrich(emp: Employee) -> dict:
    d = {
        "id": emp.id,
        "tax_id": emp.tax_id,
        "last_name": emp.last_name,
        "first_name": emp.first_name,
        "birth_date": emp.birth_date,
        "taj": emp.taj,
        "trunk_number": emp.trunk_number,
        "cost_center_id": emp.cost_center_id,
        "created_at": emp.created_at,
        "updated_at": emp.updated_at,
        "cost_center_code": emp.cost_center.code if emp.cost_center else None,
        "cost_center_name": emp.cost_center.name if emp.cost_center else None,
    }
    return d


@router.get("/", response_model=list[EmployeeResponse])
def list_employees(
    q: str | None = Query(None, description="Szabad szöveges keresés (név, adóazonosító, TAJ)"),
    cost_center_id: int | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    query = db.query(Employee).outerjoin(Employee.cost_center)

    if q:
        q_like = f"%{q}%"
        query = query.filter(
            or_(
                Employee.last_name.ilike(q_like),
                Employee.first_name.ilike(q_like),
                Employee.tax_id.ilike(q_like),
                Employee.taj.ilike(q_like),
                Employee.trunk_number.ilike(q_like),
            )
        )
    if cost_center_id:
        query = query.filter(Employee.cost_center_id == cost_center_id)

    employees = query.order_by(Employee.last_name, Employee.first_name).offset(skip).limit(limit).all()
    return [_enrich(e) for e in employees]


@router.get("/count")
def count_employees(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    return {"count": db.query(Employee).count()}


@router.post("/", response_model=EmployeeResponse, status_code=201)
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    existing = db.query(Employee).filter(Employee.tax_id == data.tax_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ez az adóazonosító már szerepel az adatbázisban.")

    if data.cost_center_id:
        cc = db.query(CostCenter).filter(CostCenter.id == data.cost_center_id).first()
        if not cc:
            raise HTTPException(status_code=400, detail="Ismeretlen költséghely.")

    emp = Employee(**data.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    # reload with join
    emp = db.query(Employee).outerjoin(Employee.cost_center).filter(Employee.id == emp.id).first()
    return _enrich(emp)


@router.patch("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Munkavállaló nem található.")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(emp, field, value)

    db.commit()
    db.refresh(emp)
    emp = db.query(Employee).outerjoin(Employee.cost_center).filter(Employee.id == emp.id).first()
    return _enrich(emp)


@router.delete("/{employee_id}", status_code=204)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Munkavállaló nem található.")
    db.delete(emp)
    db.commit()


@router.post("/import", response_model=EmployeeImportResult)
async def import_xlsx(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Csak .xlsx vagy .xls fájl fogadható el.")

    content = await file.read()
    result = import_employees_from_xlsx(content, db)
    return result
