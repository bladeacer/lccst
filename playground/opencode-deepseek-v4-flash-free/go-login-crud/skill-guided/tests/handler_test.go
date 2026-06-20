package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"login-crud/internal/cache"
	"login-crud/internal/handler"
	"login-crud/internal/repository"
)

func newTestHandler() *handler.UserHandler {
	repo := repository.NewInMemoryUserRepo()
	c := cache.NewInMemoryUserCache()
	return handler.NewUserHandler(repo, c)
}

func request(h *handler.UserHandler, method, path, body string) *httptest.ResponseRecorder {
	var req *http.Request
	req = httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	// Extract path values for pattern matching
	if strings.HasPrefix(path, "/users/") {
		idStr := strings.TrimPrefix(path, "/users/")
		req.SetPathValue("id", idStr)
	}

	w := httptest.NewRecorder()

	// Route manually based on method + path
	switch {
	case method == "POST" && path == "/register":
		h.Register(w, req)
	case method == "POST" && path == "/login":
		h.Login(w, req)
	case method == "GET" && path == "/users":
		h.ListUsers(w, req)
	case method == "GET" && strings.HasPrefix(path, "/users/"):
		h.GetUser(w, req)
	case method == "PUT" && strings.HasPrefix(path, "/users/"):
		h.UpdateUser(w, req)
	case method == "DELETE" && strings.HasPrefix(path, "/users/"):
		h.DeleteUser(w, req)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
	return w
}

func parseBody(t *testing.T, w *httptest.ResponseRecorder) map[string]interface{} {
	t.Helper()
	var m map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &m)
	if err != nil {
		t.Fatalf("failed to parse response body: %v", err)
	}
	return m
}

func TestRegisterUser(t *testing.T) {
	h := newTestHandler()
	w := request(h, "POST", "/register", `{"username":"alice","password":"secret"}`)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}
	body := parseBody(t, w)
	if body["username"] != "alice" {
		t.Errorf("expected username alice, got %v", body["username"])
	}
}

func TestRegisterDuplicateUsername(t *testing.T) {
	h := newTestHandler()
	request(h, "POST", "/register", `{"username":"alice","password":"secret"}`)
	w := request(h, "POST", "/register", `{"username":"alice","password":"other"}`)
	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}

func TestLoginSuccess(t *testing.T) {
	h := newTestHandler()
	request(h, "POST", "/register", `{"username":"alice","password":"secret"}`)
	w := request(h, "POST", "/login", `{"username":"alice","password":"secret"}`)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	body := parseBody(t, w)
	if body["message"] != "login successful" {
		t.Errorf("unexpected message: %v", body["message"])
	}
}

func TestLoginInvalidCredentials(t *testing.T) {
	h := newTestHandler()
	request(h, "POST", "/register", `{"username":"alice","password":"secret"}`)
	w := request(h, "POST", "/login", `{"username":"alice","password":"wrong"}`)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestListUsers(t *testing.T) {
	h := newTestHandler()
	request(h, "POST", "/register", `{"username":"alice","password":"secret"}`)
	request(h, "POST", "/register", `{"username":"bob","password":"pass"}`)
	w := request(h, "GET", "/users", "")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var users []map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &users)
	if err != nil {
		t.Fatalf("failed to parse users list: %v", err)
	}
	if len(users) != 2 {
		t.Errorf("expected 2 users, got %d", len(users))
	}
}

func TestGetUser(t *testing.T) {
	h := newTestHandler()
	request(h, "POST", "/register", `{"username":"alice","password":"secret"}`)

	w := request(h, "GET", "/users/1", "")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	body := parseBody(t, w)
	if body["username"] != "alice" {
		t.Errorf("expected username alice, got %v", body["username"])
	}
}

func TestGetUserNotFound(t *testing.T) {
	h := newTestHandler()
	w := request(h, "GET", "/users/999", "")
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestUpdateUser(t *testing.T) {
	h := newTestHandler()
	request(h, "POST", "/register", `{"username":"alice","password":"secret"}`)
	w := request(h, "PUT", "/users/1", `{"username":"bob"}`)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	body := parseBody(t, w)
	if body["username"] != "bob" {
		t.Errorf("expected username bob, got %v", body["username"])
	}
}

func TestDeleteUser(t *testing.T) {
	h := newTestHandler()
	request(h, "POST", "/register", `{"username":"alice","password":"secret"}`)
	w := request(h, "DELETE", "/users/1", "")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	body := parseBody(t, w)
	if body["deleted"] != true {
		t.Errorf("expected deleted true, got %v", body["deleted"])
	}
}

func TestDeleteUserNotFound(t *testing.T) {
	h := newTestHandler()
	w := request(h, "DELETE", "/users/999", "")
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestPasswordNotExposedInJSON(t *testing.T) {
	h := newTestHandler()
	w := request(h, "POST", "/register", `{"username":"alice","password":"secret"}`)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}
	body := parseBody(t, w)
	if _, exists := body["password"]; exists {
		t.Error("password field should not be present in JSON response")
	}
}

func TestUserJSONMarshallingHidesPassword(t *testing.T) {
	repo := repository.NewInMemoryUserRepo()
	c := cache.NewInMemoryUserCache()
	h := handler.NewUserHandler(repo, c)
	request(h, "POST", "/register", `{"username":"alice","password":"secret"}`)

	w := request(h, "GET", "/users/1", "")
	var raw map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &raw)
	if err != nil {
		t.Fatalf("failed to parse: %v", err)
	}
	if _, exists := raw["password"]; exists {
		t.Error("password key must not appear in JSON output")
	}
}
