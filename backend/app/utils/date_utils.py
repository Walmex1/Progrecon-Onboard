from datetime import date, datetime


def parse_date(value) -> date | None:
    """Datum konverzio: datetime objektum, ISO string, pont-elvalasztos string -> date."""
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    s = str(value).strip().replace(".", "-")
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d").date()
    except ValueError:
        return None
