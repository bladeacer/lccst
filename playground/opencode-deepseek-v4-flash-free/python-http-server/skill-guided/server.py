import json
import os
import re
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from typing import Any
from functools import wraps

USERS: list[dict[str, Any]] = []
RATE_LIMIT: dict[str, float] = {}
RATE_WINDOW = 60.0
MAX_REQUESTS = 30
DISABLE_RATE_LIMIT = os.environ.get("DISABLE_RATE_LIMIT", "").lower() in ("1", "true", "yes")


def rate_limited(func):
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        if DISABLE_RATE_LIMIT:
            return func(self, *args, **kwargs)
        ip = self.client_address[0]
        now = time.time()
        RATE_LIMIT[ip] = RATE_LIMIT.get(ip, 0)
        if now - RATE_LIMIT[ip] < 1.0 / MAX_REQUESTS * RATE_WINDOW:
            self._send_json({"error": "Rate limit exceeded"}, 429)
            return
        RATE_LIMIT[ip] = now
        return func(self, *args, **kwargs)
    return wrapper


def validate_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, data: Any, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _read_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", 0))
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            return None

    def _require_valid_body(self) -> dict[str, Any] | None:
        body = self._read_body()
        if body is None:
            self._send_json({"error": "Invalid JSON"}, 400)
        return body

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/health":
            self._send_json({"status": "ok"})
        elif path == "/users":
            self._send_json(USERS)
        else:
            self._send_json({"error": "Not found"}, 404)

    @rate_limited
    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/users":
            body = self._require_valid_body()
            if body is None:
                return
            name = body.get("name", "").strip()
            email = body.get("email", "").strip()
            if not name or not email:
                self._send_json({"error": "Name and email required"}, 400)
                return
            if not validate_email(email):
                self._send_json({"error": "Invalid email"}, 400)
                return
            user = {"id": len(USERS) + 1, "name": name, "email": email}
            USERS.append(user)
            self._send_json(user, 201)
        else:
            self._send_json({"error": "Not found"}, 404)

    @rate_limited
    def do_PUT(self) -> None:
        parts = urlparse(self.path).path.split("/")
        if len(parts) == 3 and parts[1] == "users":
            try:
                uid = int(parts[2])
            except ValueError:
                self._send_json({"error": "Invalid user ID"}, 400)
                return
            body = self._require_valid_body()
            if body is None:
                return
            for u in USERS:
                if u["id"] == uid:
                    if "name" in body:
                        u["name"] = body["name"].strip()
                    if "email" in body:
                        email = body["email"].strip()
                        if not validate_email(email):
                            self._send_json({"error": "Invalid email"}, 400)
                            return
                        u["email"] = email
                    self._send_json(u)
                    return
            self._send_json({"error": "Not found"}, 404)
        else:
            self._send_json({"error": "Not found"}, 404)

    @rate_limited
    def do_DELETE(self) -> None:
        parts = urlparse(self.path).path.split("/")
        if len(parts) == 3 and parts[1] == "users":
            try:
                uid = int(parts[2])
            except ValueError:
                self._send_json({"error": "Invalid user ID"}, 400)
                return
            for i, u in enumerate(USERS):
                if u["id"] == uid:
                    USERS.pop(i)
                    self._send_json({"deleted": True})
                    return
            self._send_json({"error": "Not found"}, 404)
        else:
            self._send_json({"error": "Not found"}, 404)

    def log_message(self, format: str, *args: Any) -> None:
        pass


if __name__ == "__main__":
    server = HTTPServer(("localhost", 18080), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
