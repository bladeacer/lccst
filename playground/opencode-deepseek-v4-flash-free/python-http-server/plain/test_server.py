import json
import threading
import urllib.request
import urllib.error
from http.server import HTTPServer
import pytest

import server as srv


@pytest.fixture
def server_url():
    httpd = HTTPServer(("", 0), srv.UserHandler)
    port = httpd.server_address[1]
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    yield f"http://localhost:{port}"
    httpd.shutdown()


@pytest.fixture(autouse=True)
def clear_state():
    srv.users.clear()
    srv.next_id = 1


def _create_user(base, name, email):
    _, data = _request(f"{base}/users", "POST", {"name": name, "email": email})
    return data["id"]


def _request(url, method="GET", body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def test_create_user(server_url):
    status, data = _request(f"{server_url}/users", "POST", {"name": "Alice", "email": "alice@test.com"})
    assert status == 201
    assert data["name"] == "Alice"
    assert isinstance(data["id"], int)


def test_list_users(server_url):
    _create_user(server_url, "Alice", "alice@test.com")
    status, data = _request(f"{server_url}/users")
    assert status == 200
    assert len(data) == 1


def test_get_user(server_url):
    uid = _create_user(server_url, "Alice", "alice@test.com")
    status, data = _request(f"{server_url}/users/{uid}")
    assert status == 200
    assert data["name"] == "Alice"


def test_get_user_not_found(server_url):
    status, data = _request(f"{server_url}/users/999")
    assert status == 404


def test_update_user(server_url):
    uid = _create_user(server_url, "Alice", "alice@test.com")
    status, data = _request(f"{server_url}/users/{uid}", "PUT", {"name": "Bob"})
    assert status == 200
    assert data["name"] == "Bob"


def test_delete_user(server_url):
    uid = _create_user(server_url, "Alice", "alice@test.com")
    status, data = _request(f"{server_url}/users/{uid}", "DELETE")
    assert status == 200
    assert data["deleted"] is True


def test_delete_user_not_found(server_url):
    status, data = _request(f"{server_url}/users/999", "DELETE")
    assert status == 404
