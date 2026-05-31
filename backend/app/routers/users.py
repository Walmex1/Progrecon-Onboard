from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import get_db
from app.dependencies import require_role
from app.models.person import Person
from app.models.user import User
from app.schemas.users import PersonResponse, UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/admin/users", tags=["admin"])


def _build_response(user: User) -> UserResponse:
    person_data = None
    if user.person:
        person_data = PersonResponse(
            id=user.person.id,
            last_name=user.person.last_name,
            first_name=user.person.first_name,
            email=user.person.email,
            is_active=user.person.is_active,
        )
    return UserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        region=user.region,
        person=person_data,
        is_active=user.is_active,
        created_at=user.created_at,
    )


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
        raise HTTPException(status_code=409, detail="Ez a felhasználónév már foglalt")
    if body.role == "pv" and not body.region:
        raise HTTPException(status_code=422, detail="PV szerepkörhöz régió kötelező")

    person_id = None
    if body.person:
        person = Person(
            last_name=body.person.last_name,
            first_name=body.person.first_name,
            email=body.person.email,
        )
        db.add(person)
        db.flush()
        person_id = person.id

    user = User(
        username=body.username,
        password_hash=hash_password(body.password) if body.password else hash_password("changeme123"),
        role=body.role,
        region=body.region.strip().title() if body.region else None,
        person_id=person_id,
        is_active=True,
    )
    db.add(user)
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
        raise HTTPException(status_code=404, detail="Nem található")
    if db.query(User).filter(User.username == body.username, User.id != user_id).first():
        raise HTTPException(status_code=409, detail="Ez a felhasználónév már foglalt")
    if body.role == "pv" and not body.region:
        raise HTTPException(status_code=422, detail="PV szerepkörhöz régió kötelező")

    if body.person:
        if db.query(Person).filter(Person.email == body.person.email, Person.id != user.person_id).first():
            raise HTTPException(status_code=409, detail="Ez az email cím már foglalt")
        if user.person:
            user.person.last_name = body.person.last_name
            user.person.first_name = body.person.first_name
            user.person.email = body.person.email
        else:
            person = Person(
                last_name=body.person.last_name,
                first_name=body.person.first_name,
                email=body.person.email,
            )
            db.add(person)
            db.flush()
            user.person_id = person.id

    user.username = body.username
    user.role = body.role
    user.region = body.region.strip().title() if body.region else None
    if body.password:
        user.password_hash = hash_password(body.password)
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
        raise HTTPException(status_code=404, detail="Nem található")
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
        raise HTTPException(status_code=404, detail="Nem található")
    user.is_active = True
    db.commit()
    db.refresh(user)
    return _build_response(user)


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Nem található")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Admin felhasználó nem törölhető")
    if user.is_active:
        raise HTTPException(status_code=400, detail="Csak inaktív felhasználó törölhető")
    if user.person:
        user.person.is_active = False
    db.delete(user)
    db.commit()
