from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.cost_center import CostCenter
from app.models.user import User
from app.schemas.cost_center import CostCenterCreate, CostCenterUpdate, CostCenterResponse

pv_router = APIRouter(prefix="/cost-centers", tags=["cost-centers"])
router = APIRouter(prefix="/admin/cost-centers", tags=["admin"])


@pv_router.get("/", response_model=list[CostCenterResponse])
def list_cost_centers_for_pv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """PV csak saját régiójának aktív cost centereit látja, admin mindenét."""
    q = db.query(CostCenter).filter(CostCenter.is_active == True)
    if current_user.role == "pv":
        q = q.filter(CostCenter.region == current_user.region)
    return q.order_by(CostCenter.code).all()


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
    cc = CostCenter(code=body.code, name=body.name, region=body.region.strip().title() if body.region else None, is_active=True)
    db.add(cc)
    db.commit()
    db.refresh(cc)
    return cc


@router.get("/regions", response_model=list[str])
def get_regions(db: Session = Depends(get_db), _: User = Depends(require_role("admin"))):
    rows = db.query(CostCenter.region).filter(CostCenter.region != None).distinct().order_by(CostCenter.region).all()
    return [r[0] for r in rows]


@router.patch("/{cc_id}", response_model=CostCenterResponse)
def update_cost_center(
    cc_id: int,
    body: CostCenterUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    cc = db.get(CostCenter, cc_id)
    if not cc:
        raise HTTPException(status_code=404, detail="Nem található")
    if body.name is not None:
        cc.name = body.name
    if body.region is not None:
        cc.region = body.region.strip().title()
    elif "region" in body.model_fields_set:
        cc.region = None
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
