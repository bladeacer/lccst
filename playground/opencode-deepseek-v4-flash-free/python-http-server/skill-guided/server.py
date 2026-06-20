import json
import http.server
import os
import re
import time
import uuid
from typing import Any

EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

users: dict[str, dict[str, Any]] = {}


class RateLimiter:
    def __init__(self, limit: int = 10, window: float = 60.0) -> None:
        self.limit = limit
        self.window = window
        self.requests: dict[str, list[float]] = {}
        self.disabled = os.environ.get("DISABLE_RATE_LIMIT", "").lower() in ("1", "true", "yes")

    def is_allowed(self, key: str) -> bool:
        if self.disabled:
            return True
        now = time.monotonic()
        timestamps = self.requests.get(key, [])
        timestamps = [t for t in timestamps if now - t < self.window]
        if len(timestamps) >= self.limit:
            return False
        timestamps.append(now)
        self.requests[key] = timestamps
        return True


rate_limiter = RateLimiter()


class Handler(http.server.BaseHTTPRequestHandler):
    def _send_json(self, status: int, data: Any) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _read_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def _check_rate(self) -> bool:
        key = self.client_address[0]
        if not rate_limiter.is_allowed(key):
            self._send_json(429, {"error": "rate limit exceeded"})
            return False
        return True

    def do_GET(self) -> None:
        if not self._check_rate():
            return
        path = self.path.rstrip("/")
        if path.startswith("/users/") and len(path) > 7:
            uid = path[7:]
            if uid in users:
                self._send_json(200, users[uid])
            else:
                self._send_json(404, {"error": "not found"})
        elif path == "/users":
            self._send_json(200, list(users.values()))
        else:
            self._send_json(404, {"error": "not found"})

    def do_POST(self) -> None:
        if not self._check_rate():
            return
        if self.path.rstrip("/") != "/users":
            self._send_json(404, {"error": "not found"})
            return
        body = self._read_body()
        username = (body.get("username") or "").strip()
        email = (body.get("email") or "").strip()
        if not username or not email:
            self._send_json(400, {"error": "username and email required"})
            return
        if not EMAIL_RE.match(email):
            self._send_json(400, {"error": "invalid email"})
            return
        uid = str(uuid.uuid4())
        user = {"id": uid, "username": username, "email": email}
        users[uid] = user
        self._send_json(201, user)

    def do_PUT(self) -> None:
        if not self._check_rate():
            return
        path = self.path.rstrip("/")
        if not path.startswith("/users/") or len(path) <= 7:
            self._send_json(404, {"error": "not found"})
            return
        uid = path[7:]
        if uid not in users:
            self._send_json(404, {"error": "not found"})
            return
        body = self._read_body()
        if "username" in body:
            users[uid]["username"] = body["username"].strip()
        if "email" in body:
            email = body["email"].strip()
            if not EMAIL_RE.match(email):
                self._send_json(400, {"error": "invalid email"})
                return
            users[uid]["email"] = email
        self._send_json(200, users[uid])

    def do_DELETE(self) -> None:
        if not self._check_rate():
            return
        path = self.path.rstrip("/")
        if not path.startswith("/users/") or len(path) <= 7:
            self._send_json(404, {"error": "not found"})
            return
        uid = path[7:]
        if uid not in users:
            self._send_json(404, {"error": "not found"})
            return
        del users[uid]
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    server = http.server.HTTPServer(("", port), Handler)
    print(f"Server on :{port}")
    server.serve_forever()
