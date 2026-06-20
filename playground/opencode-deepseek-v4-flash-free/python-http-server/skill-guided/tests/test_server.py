import json
import os
import sys
import threading
import time
from http.server import HTTPServer
from http.client import HTTPConnection

os.environ["DISABLE_RATE_LIMIT"] = "1"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from server import Handler, USERS

SERVER = None
THREAD = None
PORT = 18081


def setup_module():
    global SERVER, THREAD
    USERS.clear()
    SERVER = HTTPServer(("localhost", PORT), Handler)
    THREAD = threading.Thread(target=SERVER.serve_forever)
    THREAD.daemon = True
    THREAD.start()
    time.sleep(0.1)


def teardown_module():
    if SERVER:
        SERVER.shutdown()
        THREAD.join()


def request(method, path, body=None):
    conn = HTTPConnection("localhost", PORT, timeout=5)
    headers = {"Content-Type": "application/json"}
    b = json.dumps(body).encode() if body else None
    conn.request(method, path, b, headers)
    resp = conn.getresponse()
    data = json.loads(resp.read())
    conn.close()
    return resp.status, data


class TestHealth:
    def test_health(self):
        status, data = request("GET", "/health")
        assert status == 200
        assert data["status"] == "ok"


class TestCreateUser:
    def test_create_user(self):
        status, data = request("POST", "/users", {"name": "Alice", "email": "alice@test.com"})
        assert status == 201
        assert data["name"] == "Alice"

    def test_create_user_missing_fields(self):
        status, data = request("POST", "/users", {"name": ""})
        assert status == 400

    def test_create_user_invalid_email(self):
        status, data = request("POST", "/users", {"name": "Bob", "email": "bad"})
        assert status == 400

    def test_create_user_invalid_json(self):
        conn = HTTPConnection("localhost", PORT, timeout=5)
        conn.request("POST", "/users", b"not json", {"Content-Type": "application/json"})
        resp = conn.getresponse()
        assert resp.status == 400
        conn.close()


class TestListUsers:
    def test_list_users(self):
        status, data = request("GET", "/users")
        assert status == 200
        assert isinstance(data, list)


class TestUpdateUser:
    def test_update_user(self):
        status, data = request("PUT", "/users/1", {"name": "Alice Updated"})
        assert status == 200
        assert data["name"] == "Alice Updated"

    def test_update_user_not_found(self):
        status, data = request("PUT", "/users/999", {"name": "Ghost"})
        assert status == 404

    def test_update_invalid_id(self):
        status, data = request("PUT", "/users/abc", {"name": "x"})
        assert status == 400


class TestDeleteUser:
    def test_delete_user(self):
        status, data = request("DELETE", "/users/1")
        assert status == 200
        assert data["deleted"] is True

    def test_delete_user_not_found(self):
        status, data = request("DELETE", "/users/999")
        assert status == 404


class TestNotFound:
    def test_404(self):
        status, data = request("GET", "/nonexistent")
        assert status == 404
