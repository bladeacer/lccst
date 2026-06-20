import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

users = {}
next_id = 1


class UserHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _send_error(self, message, status=400):
        self._send_json({"error": message}, status)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def _parse_path(self):
        parsed = urlparse(self.path)
        parts = parsed.path.strip("/").split("/")
        if parts == [""]:
            return "root", None
        if len(parts) == 1 and parts[0] == "users":
            return "users", None
        if len(parts) == 2 and parts[0] == "users":
            return "user", int(parts[1])
        return "unknown", None

    def do_GET(self):
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

    def do_POST(self):
        resource, _ = self._parse_path()
        if resource != "users":
            self._send_error("Not found", 404)
            return
        global next_id
        body = self._read_body()
        name = body.get("name", "")
        email = body.get("email", "")
        user = {"id": next_id, "name": name, "email": email}
        users[next_id] = user
        next_id += 1
        self._send_json(user, 201)

    def do_PUT(self):
        resource, uid = self._parse_path()
        if resource != "user" or uid is None:
            self._send_error("Not found", 404)
            return
        if uid not in users:
            self._send_error("User not found", 404)
            return
        body = self._read_body()
        user = users[uid]
        if "name" in body:
            user["name"] = body["name"]
        if "email" in body:
            user["email"] = body["email"]
        self._send_json(user)

    def do_DELETE(self):
        resource, uid = self._parse_path()
        if resource != "user" or uid is None:
            self._send_error("Not found", 404)
            return
        if uid in users:
            del users[uid]
            self._send_json({"deleted": True})
        else:
            self._send_error("User not found", 404)


def run(port=8000):
    server = HTTPServer(("", port), UserHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    run()
