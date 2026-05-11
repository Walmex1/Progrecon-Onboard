from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import get_db
from app.dependencies import require_role
from app.models.cost_center import CostCenter
from app.models.user import User
from app.models.user_cost_center import UserCostCenter
from app.schemas.users import CostCenterShort, UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/admin/users", tags=["admin"])


def _build_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        cost_centers=[
            CostCenterShort(id=cc.id, code=cc.code, name=cc.name)
            for cc in user.cost_centers
        ],
        is_active=user.is_active,
        created_at=user.created_at,
    )


def _add_user_cost_centers(db: Session, user_id: int, cost_center_ids: list[int]) -> None:
    for cc_id in cost_center_ids:
        cc = db.get(CostCenter, cc_id)
        if not cc:
            raise HTTPException(status_code=404, detail=f"K\u00f6lts\u00e9ghely nem tal\u00e1lhat\u00f3: {cc_id}")
        db.add(UserCostCenter(user_id=user_id, cost_center_id=cc_id))


@router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    users = db.query(User).order_by(User.username).all()
    return [_build_response(u) for u in users]


@router.post("/", response_model=UserResponse, status_code=201)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=409, detail="Ez a felhaszn\u00e1l\u00f3n\u00e9v m\u00e1r foglalt")
    if body.role == "pv" and not body.cost_center_ids:
        raise HTTPException(status_code=422, detail="PV szerepk\u00f6rh\u00f6z legal\u00e1bb egy k\u00f6lts\u00e9ghely k\u00f6telez\u0151")

    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        role=body.role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    _add_user_cost_centers(db, user.id, body.cost_center_ids)
    db.commit()
    db.refresh(user)
    return _build_response(user)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Nem tal\u00e1lhat\u00f3")
    if body.role == "pv" and not body.cost_center_ids:
        raise HTTPException(status_code=422, detail="PV szerepk\u00f6rh\u00f6z legal\u00e1bb egy k\u00f6lts\u00e9ghely k\u00f6telez\u0151")

    user.role = body.role
    db.query(UserCostCenter).filter(UserCostCenter.user_id == user_id).delete()
    _add_user_cost_centers(db, user.id, body.cost_center_ids)
    db.commit()
    db.refresh(user)
    return _build_response(user)


@router.post("/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Nem tal\u00e1lhat\u00f3")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return _build_response(user)


@router.post("/{user_id}/activate", response_model=UserResponse)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Nem tal\u00e1lhat\u00f3")
    user.is_active = True
    db.commit()
    db.refresh(user)
    return _build_response(user)


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Nem tal\u00e1lhat\u00f3")
    if user.is_active:
        raise HTTPException(status_code=400, detail="Csak inakt\u00edv felhaszn\u00e1l\u00f3 t\u00f6r\u00f6lhet\u0151")
    db.delete(user)
    db.commit()
