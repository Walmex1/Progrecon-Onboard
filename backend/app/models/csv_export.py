from datetime import datetime, timezone
from sqlalchemy import Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class CsvExport(Base):
    __tablename__ = "csv_exports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entry_record_id: Mapped[int] = mapped_column(Integer, ForeignKey("entry_records.id"), nullable=False)
    exported_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    csv_type: Mapped[str] = mapped_column(String, nullable=False)  # NBTorzs, NBJuttat, NBLevon, NBSZEPKAdat
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    exported_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
