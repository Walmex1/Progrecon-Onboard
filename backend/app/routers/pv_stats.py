from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models.cost_center import CostCenter
from app.models.employee import Employee
from app.models.entry_record import EntryRecord
from app.models.user import User

router = APIRouter(prefix="/pv/stats", tags=["pv"])


class CostCenterStats(BaseModel):
    cost_center_id: int
    code: str
    name: str
    total: int
    delta_today: int
    delta_week: int
    delta_month: int


class PvStatsResponse(BaseModel):
    cost_centers: list[CostCenterStats]
    total_all: int


def _delta_count(db: Session, cost_center_id: int, start: datetime) -> int:
    return (
        db.query(EntryRecord)
        .filter(
            EntryRecord.cost_center_id == cost_center_id,
            EntryRecord.status.in_(("csv_let\u00f6ltve", "lezarva")),
            EntryRecord.updated_at >= start,
        )
        .count()
    )


@router.get("/", response_model=PvStatsResponse)
def get_pv_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("pv", "admin")),
):
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    stats = []
    total_all = 0

    if current_user.role == "admin":
        cost_centers = db.query(CostCenter).filter(CostCenter.is_active == True).order_by(CostCenter.code).all()
    else:
        cost_centers = db.query(CostCenter).filter(CostCenter.region == current_user.region, CostCenter.is_active == True).order_by(CostCenter.code).all()

    for cc in cost_centers:
        total = db.query(Employee).filter(Employee.cost_center_id == cc.id).count()
        total_all += total
        stats.append(
            CostCenterStats(
                cost_center_id=cc.id,
                code=cc.code,
                name=cc.name,
                total=total,
                delta_today=_delta_count(db, cc.id, today_start),
                delta_week=_delta_count(db, cc.id, week_start),
                delta_month=_delta_count(db, cc.id, month_start),
            )
        )

    return PvStatsResponse(cost_centers=stats, total_all=total_all)
