import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

USERS = []


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self._send_json({"status": "ok"})
        elif path == "/users":
            self._send_json(USERS)
        else:
            self._send_json({"error": "Not found"}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/users":
            body = self._read_body()
            user = {"id": len(USERS) + 1, "name": body.get("name", ""), "email": body.get("email", "")}
            USERS.append(user)
            self._send_json(user, 201)
        else:
            self._send_json({"error": "Not found"}, 404)

    def do_PUT(self):
        parts = urlparse(self.path).path.split("/")
        if len(parts) == 3 and parts[1] == "users":
            uid = int(parts[2])
            body = self._read_body()
            for u in USERS:
                if u["id"] == uid:
                    u.update({k: v for k, v in body.items() if k in ("name", "email")})
                    self._send_json(u)
                    return
            self._send_json({"error": "Not found"}, 404)
        else:
            self._send_json({"error": "Not found"}, 404)

    def do_DELETE(self):
        parts = urlparse(self.path).path.split("/")
        if len(parts) == 3 and parts[1] == "users":
            uid = int(parts[2])
            for i, u in enumerate(USERS):
                if u["id"] == uid:
                    USERS.pop(i)
                    self._send_json({"deleted": True})
                    return
            self._send_json({"error": "Not found"}, 404)
        else:
            self._send_json({"error": "Not found"}, 404)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    server = HTTPServer(("localhost", 18080), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
