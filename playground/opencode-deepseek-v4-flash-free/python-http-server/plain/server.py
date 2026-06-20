import json
import http.server
import os
import re
from urllib.parse import urlparse

users = {}
next_id = 1

def parse_path(path):
    match = re.match(r"^/users/(\d+)$", path)
    if match:
        return ("user", match.group(1))
    if path == "/users":
        return ("list", None)
    return (None, None)

class Handler(http.server.BaseHTTPRequestHandler):
    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def do_GET(self):
        kind, uid = parse_path(self.path)
        if kind == "user" and uid in users:
            self._send_json(200, users[uid])
        elif kind == "list":
            self._send_json(200, list(users.values()))
        else:
            self._send_json(404, {"error": "not found"})

    def do_POST(self):
        global next_id
        if self.path != "/users":
            self._send_json(404, {"error": "not found"})
            return
        body = self._read_body()
        username = body.get("username", "")
        email = body.get("email", "")
        if not username or not email:
            self._send_json(400, {"error": "username and email required"})
            return
        uid = str(next_id)
        next_id += 1
        user = {"id": uid, "username": username, "email": email}
        users[uid] = user
        self._send_json(201, user)

    def do_PUT(self):
        kind, uid = parse_path(self.path)
        if kind != "user" or uid not in users:
            self._send_json(404, {"error": "not found"})
            return
        body = self._read_body()
        if "username" in body:
            users[uid]["username"] = body["username"]
        if "email" in body:
            users[uid]["email"] = body["email"]
        self._send_json(200, users[uid])

    def do_DELETE(self):
        kind, uid = parse_path(self.path)
        if kind != "user" or uid not in users:
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
