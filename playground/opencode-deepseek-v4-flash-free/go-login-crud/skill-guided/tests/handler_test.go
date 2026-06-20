package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"go-login-crud-skill/internal/handler"
	"go-login-crud-skill/internal/repository"
)

func TestHealth(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	h.Health(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "ok" {
		t.Errorf("expected ok, got %s", resp["status"])
	}
}

func TestCreateUser(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	body := map[string]string{"name": "Alice", "email": "alice@test.com"}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/users", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.HandleUsers(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", w.Code)
	}

	var user map[string]interface{}
	json.NewDecoder(w.Body).Decode(&user)
	if user["name"] != "Alice" {
		t.Errorf("expected Alice, got %s", user["name"])
	}
	if user["id"] == nil {
		t.Error("expected id")
	}
}

func TestCreateUserMissingFields(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	body := map[string]string{"name": ""}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/users", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.HandleUsers(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestListUsers(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	body := map[string]string{"name": "Bob", "email": "bob@test.com"}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/users", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.HandleUsers(w, req)

	req2 := httptest.NewRequest("GET", "/users", nil)
	w2 := httptest.NewRecorder()
	h.HandleUsers(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w2.Code)
	}

	var users []interface{}
	json.NewDecoder(w2.Body).Decode(&users)
	if len(users) != 1 {
		t.Errorf("expected 1 user, got %d", len(users))
	}
}

func TestUpdateUser(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	body := map[string]string{"name": "Charlie", "email": "charlie@test.com"}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/users", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.HandleUsers(w, req)

	var created map[string]interface{}
	json.NewDecoder(w.Body).Decode(&created)

	update := map[string]string{"name": "Charlie Updated"}
	b2, _ := json.Marshal(update)
	req2 := httptest.NewRequest("PUT", "/users/1", bytes.NewReader(b2))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	h.HandleUserByID(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w2.Code)
	}

	var updated map[string]interface{}
	json.NewDecoder(w2.Body).Decode(&updated)
	if updated["name"] != "Charlie Updated" {
		t.Errorf("expected Charlie Updated, got %s", updated["name"])
	}
}

func TestUpdateUserNotFound(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	update := map[string]string{"name": "Ghost"}
	b, _ := json.Marshal(update)
	req := httptest.NewRequest("PUT", "/users/999", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.HandleUserByID(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestDeleteUser(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	body := map[string]string{"name": "Dave", "email": "dave@test.com"}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/users", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.HandleUsers(w, req)

	req2 := httptest.NewRequest("DELETE", "/users/1", nil)
	w2 := httptest.NewRecorder()
	h.HandleUserByID(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w2.Code)
	}

	var resp map[string]interface{}
	json.NewDecoder(w2.Body).Decode(&resp)
	if resp["deleted"] != true {
		t.Errorf("expected deleted true, got %v", resp["deleted"])
	}
}

func TestDeleteUserNotFound(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	req := httptest.NewRequest("DELETE", "/users/999", nil)
	w := httptest.NewRecorder()
	h.HandleUserByID(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestGetUserByID(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	body := map[string]string{"name": "Eve", "email": "eve@test.com"}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/users", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.HandleUsers(w, req)

	req2 := httptest.NewRequest("GET", "/users/1", nil)
	w2 := httptest.NewRecorder()
	h.HandleUserByID(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w2.Code)
	}

	var user map[string]interface{}
	json.NewDecoder(w2.Body).Decode(&user)
	if user["name"] != "Eve" {
		t.Errorf("expected Eve, got %s", user["name"])
	}
}

func TestGetUserByIDNotFound(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	req := httptest.NewRequest("GET", "/users/999", nil)
	w := httptest.NewRecorder()
	h.HandleUserByID(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestMethodNotAllowed(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	req := httptest.NewRequest("PATCH", "/users", nil)
	w := httptest.NewRecorder()
	h.HandleUsers(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

func TestInvalidUserID(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	req := httptest.NewRequest("GET", "/users/abc", nil)
	w := httptest.NewRecorder()
	h.HandleUserByID(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestInvalidJSON(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	req := httptest.NewRequest("POST", "/users", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.HandleUsers(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestInvalidJSONOnUpdate(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	req := httptest.NewRequest("PUT", "/users/1", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.HandleUserByID(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestNotFound(t *testing.T) {
	repo := repository.NewUserRepository()
	h := handler.NewUserHandler(repo)

	mux := http.NewServeMux()
	mux.HandleFunc("/health", h.Health)
	mux.HandleFunc("/users", h.HandleUsers)
	mux.HandleFunc("/users/", h.HandleUserByID)

	req := httptest.NewRequest("GET", "/nonexistent", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}
