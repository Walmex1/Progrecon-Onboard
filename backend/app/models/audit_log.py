from datetime import datetime, timezone
from sqlalchemy import Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    record_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    record_type: Mapped[str | None] = mapped_column(String, nullable=True)  # entry_record, csv_export stb.
    action: Mapped[str] = mapped_column(String, nullable=False)  # create, update, submit, export stb.
    old_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
