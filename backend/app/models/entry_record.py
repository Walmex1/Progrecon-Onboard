from datetime import datetime, timezone
from sqlalchemy import Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class EntryRecord(Base):
    __tablename__ = "entry_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_type: Mapped[str] = mapped_column(String, nullable=False)  # belep, kilep, modositas
    status: Mapped[str] = mapped_column(String, nullable=False, default="folyamatban")
    employee_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("employees.id"), nullable=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    cost_center_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("cost_centers.id"), nullable=True)
    form_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
