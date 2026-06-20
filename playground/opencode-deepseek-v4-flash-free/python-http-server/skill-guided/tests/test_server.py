import os
os.environ["DISABLE_RATE_LIMIT"] = "1"

import json
import time
from http.server import HTTPServer
from threading import Thread

import pytest
from server import Handler, users, rate_limiter, EMAIL_RE  # noqa: E402


@pytest.fixture(scope="session")
def server_url():
    httpd = HTTPServer(("", 0), Handler)
    port = httpd.server_address[1]
    t = Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    time.sleep(0.05)
    url = f"http://localhost:{port}"
    yield url
    httpd.shutdown()


@pytest.fixture(autouse=True)
def clear_users():
    users.clear()
    yield


def _request(method, url, data=None, expected_status=None):
    import urllib.request
    import urllib.error
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode() if data else None,
        method=method,
        headers={"Content-Type": "application/json"} if data else {},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        body = json.loads(resp.read()) if resp.status != 204 else None
        if expected_status:
            assert resp.status == expected_status, f"expected {expected_status}, got {resp.status}: {body}"
        return resp.status, body
    except urllib.error.HTTPError as e:
        if expected_status:
            assert e.code == expected_status, f"expected {expected_status}, got {e.code}"
        raise


def test_create_user(server_url):
    status, body = _request("POST", f"{server_url}/users", {"username": "alice", "email": "alice@example.com"}, 201)
    assert body["username"] == "alice"
    assert body["email"] == "alice@example.com"
    assert "id" in body


def test_create_user_missing_fields(server_url):
    with pytest.raises(Exception):
        _request("POST", f"{server_url}/users", {"username": "bob"}, 400)


def test_create_user_invalid_email(server_url):
    with pytest.raises(Exception):
        _request("POST", f"{server_url}/users", {"username": "bob", "email": "notanemail"}, 400)


def test_get_user(server_url):
    _, created = _request("POST", f"{server_url}/users", {"username": "carol", "email": "carol@example.com"}, 201)
    uid = created["id"]
    _, body = _request("GET", f"{server_url}/users/{uid}", expected_status=200)
    assert body["username"] == "carol"


def test_get_user_not_found(server_url):
    with pytest.raises(Exception):
        _request("GET", f"{server_url}/users/nonexistent", expected_status=404)


def test_update_user(server_url):
    _, created = _request("POST", f"{server_url}/users", {"username": "dave", "email": "dave@example.com"}, 201)
    uid = created["id"]
    _, body = _request("PUT", f"{server_url}/users/{uid}", {"username": "dave_updated"}, 200)
    assert body["username"] == "dave_updated"


def test_delete_user(server_url):
    _, created = _request("POST", f"{server_url}/users", {"username": "eve", "email": "eve@example.com"}, 201)
    uid = created["id"]
    _request("DELETE", f"{server_url}/users/{uid}", expected_status=204)
    with pytest.raises(Exception):
        _request("GET", f"{server_url}/users/{uid}", expected_status=404)


def test_list_users(server_url):
    for i in range(3):
        _request("POST", f"{server_url}/users", {"username": f"user{i}", "email": f"user{i}@example.com"}, 201)
    _, body = _request("GET", f"{server_url}/users", expected_status=200)
    assert len(body) == 3


def test_email_regex_valid():
    valid = ["user@example.com", "user+tag@domain.co", "a.b@sub.example.org"]
    for email in valid:
        assert EMAIL_RE.match(email), f"expected {email} to be valid"


def test_email_regex_invalid():
    invalid = ["", "plainaddress", "@domain.com", "user@"]
    for email in invalid:
        assert not EMAIL_RE.match(email), f"expected {email} to be invalid"


def test_rate_limiter_disabled():
    assert rate_limiter.disabled is True
    assert rate_limiter.is_allowed("any") is True
