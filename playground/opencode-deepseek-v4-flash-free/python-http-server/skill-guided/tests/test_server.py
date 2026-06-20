import json
import os
import threading
import time
import unittest
from http.client import HTTPConnection
from http.server import HTTPServer

os.environ["DISABLE_RATE_LIMIT"] = "1"

from server import Handler, users  # noqa: E402


class TestBase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        users.clear()
        cls.server = HTTPServer(("127.0.0.1", 0), Handler)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.05)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def setUp(self):
        users.clear()
        self.conn = HTTPConnection("127.0.0.1", self.port)

    def tearDown(self):
        self.conn.close()

    def _post(self, path: str, body: dict) -> tuple[int, dict]:
        self.conn.request("POST", path, json.dumps(body), {"Content-Type": "application/json"})
        resp = self.conn.getresponse()
        data = json.loads(resp.read())
        return resp.status, data

    def _get(self, path: str) -> tuple[int, dict | list]:
        self.conn.request("GET", path)
        resp = self.conn.getresponse()
        data = json.loads(resp.read())
        return resp.status, data

    def _put(self, path: str, body: dict) -> tuple[int, dict]:
        self.conn.request("PUT", path, json.dumps(body), {"Content-Type": "application/json"})
        resp = self.conn.getresponse()
        data = json.loads(resp.read())
        return resp.status, data

    def _delete(self, path: str) -> tuple[int, bytes]:
        self.conn.request("DELETE", path)
        resp = self.conn.getresponse()
        return resp.status, resp.read()


class TestHealth(TestBase):
    def test_health(self):
        status, data = self._get("/health")
        self.assertEqual(status, 200)
        self.assertEqual(data, {"status": "ok"})


class TestCreateUser(TestBase):
    def test_create_user(self):
        status, data = self._post("/users", {"name": "Alice", "email": "alice@example.com"})
        self.assertEqual(status, 201)
        self.assertEqual(data["name"], "Alice")
        self.assertEqual(data["email"], "alice@example.com")
        self.assertIn("id", data)

    def test_create_user_missing_fields(self):
        status, data = self._post("/users", {"name": "Alice"})
        self.assertEqual(status, 400)
        self.assertIn("error", data)

    def test_create_user_invalid_email(self):
        status, data = self._post("/users", {"name": "Alice", "email": "not-an-email"})
        self.assertEqual(status, 400)
        self.assertIn("error", data)

    def test_create_user_invalid_json(self):
        self.conn.request("POST", "/users", b"not json", {"Content-Type": "application/json"})
        resp = self.conn.getresponse()
        data = json.loads(resp.read())
        self.assertEqual(resp.status, 400)
        self.assertIn("error", data)


class TestListUsers(TestBase):
    def test_list_users(self):
        self._post("/users", {"name": "Alice", "email": "alice@example.com"})
        self._post("/users", {"name": "Bob", "email": "bob@example.com"})
        status, data = self._get("/users")
        self.assertEqual(status, 200)
        self.assertEqual(len(data), 2)


class TestUpdateUser(TestBase):
    def test_update_user(self):
        _, created = self._post("/users", {"name": "Alice", "email": "alice@example.com"})
        uid = created["id"]
        status, data = self._put(f"/users/{uid}", {"name": "Alice Updated"})
        self.assertEqual(status, 200)
        self.assertEqual(data["name"], "Alice Updated")

    def test_update_user_not_found(self):
        status, data = self._put("/users/nonexistent", {"name": "Nobody"})
        self.assertEqual(status, 404)
        self.assertIn("error", data)

    def test_update_invalid_id(self):
        status, data = self._put("/users/", {"name": "Nobody"})
        self.assertEqual(status, 404)


class TestDeleteUser(TestBase):
    def test_delete_user(self):
        _, created = self._post("/users", {"name": "Alice", "email": "alice@example.com"})
        uid = created["id"]
        status, _ = self._delete(f"/users/{uid}")
        self.assertEqual(status, 204)

    def test_delete_user_not_found(self):
        status, data = self._delete("/users/nonexistent")
        self.assertEqual(status, 404)


class TestNotFound(TestBase):
    def test_404(self):
        status, data = self._get("/nonexistent")
        self.assertEqual(status, 404)
        self.assertIn("error", data)


if __name__ == "__main__":
    unittest.main()
