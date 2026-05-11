from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models.cost_center import CostCenter
from app.models.user import User
from app.schemas.cost_center import CostCenterCreate, CostCenterResponse

router = APIRouter(prefix="/admin/cost-centers", tags=["admin"])


@router.get("/", response_model=list[CostCenterResponse])
def list_cost_centers(
    active_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    q = db.query(CostCenter)
    if active_only:
        q = q.filter(CostCenter.is_active == True)
    return q.order_by(CostCenter.code).all()


@router.post("/", response_model=CostCenterResponse, status_code=201)
def create_cost_center(
    body: CostCenterCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    existing = db.query(CostCenter).filter(CostCenter.code == body.code).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ez a kód már foglalt")
    cc = CostCenter(code=body.code, name=body.name, is_active=True)
    db.add(cc)
    db.commit()
    db.refresh(cc)
    return cc


@router.post("/{cc_id}/deactivate", response_model=CostCenterResponse)
def deactivate_cost_center(
    cc_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    cc = db.get(CostCenter, cc_id)
    if not cc:
        raise HTTPException(status_code=404, detail="Nem található")
    cc.is_active = False
    db.commit()
    db.refresh(cc)
    return cc


@router.post("/{cc_id}/activate", response_model=CostCenterResponse)
def activate_cost_center(
    cc_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    cc = db.get(CostCenter, cc_id)
    if not cc:
        raise HTTPException(status_code=404, detail="Nem található")
    cc.is_active = True
    db.commit()
    db.refresh(cc)
    return cc


@router.delete("/{cc_id}", status_code=204)
def delete_cost_center(
    cc_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    cc = db.get(CostCenter, cc_id)
    if not cc:
        raise HTTPException(status_code=404, detail="Nem található")
    if cc.is_active:
        raise HTTPException(status_code=400, detail="Csak inaktív költséghely törölhető")
    db.delete(cc)
    db.commit()
