import json
import mimetypes
import uuid
from pathlib import Path
from urllib import request, error


BASE_URL = "http://127.0.0.1:8744"
ADMIN_USERNAME = "admin"
XLSX_PATH = Path(__file__).resolve().parent / "MIntacsomag 2.0.xlsx"


def http_json(method: str, path: str, payload: dict | None = None, token: str | None = None):
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = request.Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=30) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else None
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed: HTTP {exc.code}: {detail}") from exc


def upload_file(path: Path, token: str):
    boundary = f"----employee-import-{uuid.uuid4().hex}"
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    file_bytes = path.read_bytes()

    body = b"".join(
        [
            f"--{boundary}\r\n".encode("utf-8"),
            f'Content-Disposition: form-data; name="file"; filename="{path.name}"\r\n'.encode("utf-8"),
            f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
            file_bytes,
            f"\r\n--{boundary}--\r\n".encode("utf-8"),
        ]
    )

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    }
    req = request.Request(f"{BASE_URL}/admin/employees/import", data=body, headers=headers, method="POST")
    try:
        with request.urlopen(req, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"POST /admin/employees/import failed: HTTP {exc.code}: {detail}") from exc


def main():
    if not XLSX_PATH.exists():
        raise FileNotFoundError(XLSX_PATH)

    login = http_json("POST", "/auth/login", {"username": ADMIN_USERNAME})
    token = login["access_token"]

    import_result = None
    print("Import result:")
    try:
        import_result = upload_file(XLSX_PATH, token)
        print(f"  created: {import_result.get('created')}")
        print(f"  updated: {import_result.get('updated')}")
        print(f"  skipped: {import_result.get('skipped')}")
        print(f"  errors: {import_result.get('errors')}")
    except RuntimeError as exc:
        print(f"  request failed: {exc}")

    employees = http_json("GET", "/admin/employees/?limit=1000", token=token)
    missing_cost_center = [employee for employee in employees if employee.get("cost_center_id") is None]

    print()
    print(f"Employees found: {len(employees)}")
    if not employees:
        print("cost_center_id check: FAILED (no employees returned to verify)")
        raise SystemExit(1)

    print(f"Employees with cost_center_id=None: {len(missing_cost_center)}")
    if missing_cost_center:
        sample = missing_cost_center[:10]
        print("Missing cost_center_id sample:")
        for employee in sample:
            name = f"{employee.get('last_name')} {employee.get('first_name')}"
            print(f"  id={employee.get('id')} tax_id={employee.get('tax_id')} name={name}")
        raise SystemExit(1)

    print("cost_center_id check: OK (all returned employees have a value)")
    if import_result is None:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
