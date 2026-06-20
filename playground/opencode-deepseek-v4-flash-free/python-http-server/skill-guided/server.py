import json
import os
import re
import time
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any
from urllib.parse import urlparse

EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

users: dict[str, dict[str, Any]] = {}
rate_limit_store: dict[str, float] = {}
RATE_LIMIT_WINDOW = 1.0
DISABLE_RATE_LIMIT = os.environ.get("DISABLE_RATE_LIMIT") == "1"


def validate_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email))


def validate_create(body: dict[str, Any]) -> str | None:
    if not isinstance(body.get("name"), str) or not body["name"].strip():
        return "Name is required"
    if not isinstance(body.get("email"), str) or not validate_email(body["email"]):
        return "Valid email is required"
    return None


def validate_update(body: dict[str, Any]) -> str | None:
    if "name" in body and (not isinstance(body["name"], str) or not body["name"].strip()):
        return "Name must be a non-empty string"
    if "email" in body and (not isinstance(body["email"], str) or not validate_email(body["email"])):
        return "Valid email is required"
    return None


def check_rate_limit(ip: str) -> bool:
    if DISABLE_RATE_LIMIT:
        return True
    now = time.monotonic()
    last = rate_limit_store.get(ip)
    if last and now - last < RATE_LIMIT_WINDOW:
        return False
    rate_limit_store[ip] = now
    return True


class UserHandler(BaseHTTPRequestHandler):
    def _send_json(self, data: Any, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _send_error(self, message: str, status: int = 400) -> None:
        self._send_json({"error": message}, status)

    def _read_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", 0))
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            return {}

    def _parse_path(self) -> tuple[str, str | None]:
        parsed = urlparse(self.path)
        parts = parsed.path.strip("/").split("/")
        if parts == [""]:
            return "root", None
        if len(parts) == 1 and parts[0] == "users":
            return "users", None
        if len(parts) == 2 and parts[0] == "users":
            return "user", parts[1]
        return "unknown", None

    def do_GET(self) -> None:
        ip = self.client_address[0]
        if not check_rate_limit(ip):
            self._send_error("Rate limit exceeded", 429)
            return
        resource, uid = self._parse_path()
        if resource == "users":
            self._send_json(list(users.values()))
        elif resource == "user":
            user = users.get(uid)
            if user:
                self._send_json(user)
            else:
                self._send_error("User not found", 404)
        else:
            self._send_error("Not found", 404)

    def do_POST(self) -> None:
        ip = self.client_address[0]
        if not check_rate_limit(ip):
            self._send_error("Rate limit exceeded", 429)
            return
        resource, _ = self._parse_path()
        if resource != "users":
            self._send_error("Not found", 404)
            return
        body = self._read_body()
        error = validate_create(body)
        if error:
            self._send_error(error)
            return
        uid = str(uuid.uuid4())
        user = {"id": uid, "name": body["name"].strip(), "email": body["email"].strip()}
        users[uid] = user
        self._send_json(user, 201)

    def do_PUT(self) -> None:
        ip = self.client_address[0]
        if not check_rate_limit(ip):
            self._send_error("Rate limit exceeded", 429)
            return
        resource, uid = self._parse_path()
        if resource != "user" or uid is None:
            self._send_error("Not found", 404)
            return
        if uid not in users:
            self._send_error("User not found", 404)
            return
        body = self._read_body()
        error = validate_update(body)
        if error:
            self._send_error(error)
            return
        user = users[uid]
        if "name" in body:
            user["name"] = body["name"].strip()
        if "email" in body:
            user["email"] = body["email"].strip()
        self._send_json(user)

    def do_DELETE(self) -> None:
        ip = self.client_address[0]
        if not check_rate_limit(ip):
            self._send_error("Rate limit exceeded", 429)
            return
        resource, uid = self._parse_path()
        if resource != "user" or uid is None:
            self._send_error("Not found", 404)
            return
        if uid in users:
            del users[uid]
            self._send_json({"deleted": True})
        else:
            self._send_error("User not found", 404)


def run(port: int = 8000) -> None:
    server = HTTPServer(("", port), UserHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    run()
