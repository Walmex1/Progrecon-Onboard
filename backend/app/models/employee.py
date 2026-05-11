from datetime import datetime, timezone
from sqlalchemy import Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tax_id: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    birth_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    taj: Mapped[str | None] = mapped_column(String(9), nullable=True)
    trunk_number: Mapped[str | None] = mapped_column(String, nullable=True)
    cost_center_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("cost_centers.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    cost_center = relationship("CostCenter", lazy="select")
