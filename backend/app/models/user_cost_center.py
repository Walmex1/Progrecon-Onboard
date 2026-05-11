from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserCostCenter(Base):
    __tablename__ = "user_cost_centers"

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        primary_key=True,
        nullable=False,
    )
    cost_center_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("cost_centers.id"),
        primary_key=True,
        nullable=False,
    )
