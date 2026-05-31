from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, PersonShort, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hibás felhasználónév",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A felhasználó inaktív",
        )

    token = create_access_token(user.id, user.role)
    person = None
    if user.person:
        person = PersonShort(
            last_name=user.person.last_name,
            first_name=user.person.first_name,
        )
    return TokenResponse(
        access_token=token,
        role=user.role,
        region=user.region,
        person=person,
    )
