#!/usr/bin/env python3
import json
import os
import re
import time
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any
from urllib.parse import urlparse

EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

DISABLE_RATE_LIMIT = os.environ.get("DISABLE_RATE_LIMIT") == "1"

users: dict[str, dict[str, Any]] = {}

RateLimitStore = dict[str, list[float]]

class RateLimiter:
    def __init__(self, max_requests: int = 10, window: float = 1.0) -> None:
        self.max_requests = max_requests
        self.window = window
        self.store: RateLimitStore = {}

    def is_allowed(self, client_ip: str) -> bool:
        if DISABLE_RATE_LIMIT:
            return True
        now = time.monotonic()
        timestamps = self.store.get(client_ip, [])
        timestamps = [t for t in timestamps if now - t < self.window]
        if len(timestamps) >= self.max_requests:
            self.store[client_ip] = timestamps
            return False
        timestamps.append(now)
        self.store[client_ip] = timestamps
        return True

rate_limiter = RateLimiter()

def validate_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email))

def validate_create(data: dict[str, Any]) -> str | None:
    if "name" not in data or not isinstance(data["name"], str) or not data["name"].strip():
        return "Name is required"
    if "email" not in data or not isinstance(data["email"], str) or not data["email"].strip():
        return "Email is required"
    if not validate_email(data["email"]):
        return "Invalid email format"
    return None

def validate_update(data: dict[str, Any]) -> str | None:
    if "email" in data and data["email"] is not None:
        if not isinstance(data["email"], str) or not data["email"].strip():
            return "Email must be a non-empty string"
        if not validate_email(data["email"]):
            return "Invalid email format"
    if "name" in data and data["name"] is not None:
        if not isinstance(data["name"], str) or not data["name"].strip():
            return "Name must be a non-empty string"
    return None

def json_response(handler: BaseHTTPRequestHandler, status: int, data: Any) -> None:
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.end_headers()
    handler.wfile.write(json.dumps(data).encode())

class Handler(BaseHTTPRequestHandler):
    def _get_client_ip(self) -> str:
        return self.client_address[0]

    def _read_json(self) -> dict[str, Any] | None:
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return None
        try:
            return json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            return None

    def do_GET(self) -> None:
        client_ip = self._get_client_ip()
        if not rate_limiter.is_allowed(client_ip):
            json_response(self, 429, {"error": "Rate limit exceeded"})
            return
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/health":
            json_response(self, 200, {"status": "ok"})
        elif path == "/users":
            json_response(self, 200, list(users.values()))
        elif match := re.match(r"/users/([a-zA-Z0-9-]+)", path):
            uid = match.group(1)
            user = users.get(uid)
            if user:
                json_response(self, 200, user)
            else:
                json_response(self, 404, {"error": "User not found"})
        else:
            json_response(self, 404, {"error": "Not found"})

    def do_POST(self) -> None:
        client_ip = self._get_client_ip()
        if not rate_limiter.is_allowed(client_ip):
            json_response(self, 429, {"error": "Rate limit exceeded"})
            return
        parsed = urlparse(self.path)
        if parsed.path != "/users":
            json_response(self, 404, {"error": "Not found"})
            return
        data = self._read_json()
        if data is None:
            json_response(self, 400, {"error": "Invalid JSON"})
            return
        error = validate_create(data)
        if error:
            json_response(self, 400, {"error": error})
            return
        uid = str(uuid.uuid4())
        user = {"id": uid, "name": data["name"].strip(), "email": data["email"].strip()}
        users[uid] = user
        json_response(self, 201, user)

    def do_PUT(self) -> None:
        client_ip = self._get_client_ip()
        if not rate_limiter.is_allowed(client_ip):
            json_response(self, 429, {"error": "Rate limit exceeded"})
            return
        if match := re.match(r"/users/([a-zA-Z0-9-]+)", self.path):
            uid = match.group(1)
            if uid not in users:
                json_response(self, 404, {"error": "User not found"})
                return
            data = self._read_json()
            if data is None:
                json_response(self, 400, {"error": "Invalid JSON"})
                return
            error = validate_update(data)
            if error:
                json_response(self, 400, {"error": error})
                return
            if "name" in data:
                users[uid]["name"] = data["name"].strip()
            if "email" in data:
                users[uid]["email"] = data["email"].strip()
            json_response(self, 200, users[uid])
        else:
            json_response(self, 404, {"error": "Not found"})

    def do_DELETE(self) -> None:
        client_ip = self._get_client_ip()
        if not rate_limiter.is_allowed(client_ip):
            json_response(self, 429, {"error": "Rate limit exceeded"})
            return
        if match := re.match(r"/users/([a-zA-Z0-9-]+)", self.path):
            uid = match.group(1)
            if uid in users:
                del users[uid]
                self.send_response(204)
                self.end_headers()
            else:
                json_response(self, 404, {"error": "User not found"})
        else:
            json_response(self, 404, {"error": "Not found"})

    def log_message(self, format: str, *args: Any) -> None:
        pass

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8000), Handler)
    server.serve_forever()
