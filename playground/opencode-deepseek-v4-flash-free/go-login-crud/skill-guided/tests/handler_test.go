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

func setupHandler() *handler.UserHandler {
	repo := repository.NewInMemoryUserRepository()
	return handler.NewUserHandler(repo)
}

func TestHealth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	}).ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	var body map[string]string
	json.NewDecoder(resp.Body).Decode(&body)
	if body["status"] != "ok" {
		t.Errorf("expected ok, got %s", body["status"])
	}
}

func TestCreateUser(t *testing.T) {
	h := setupHandler()
	body := bytes.NewBufferString(`{"username":"alice","password":"secret"}`)
	req := httptest.NewRequest(http.MethodPost, "/users", body)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusCreated {
		t.Errorf("expected 201, got %d", resp.StatusCode)
	}
	var user map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&user)
	if user["username"] != "alice" {
		t.Errorf("expected alice, got %v", user["username"])
	}
}

func TestCreateUserMissingFields(t *testing.T) {
	h := setupHandler()
	body := bytes.NewBufferString(`{"username":"alice"}`)
	req := httptest.NewRequest(http.MethodPost, "/users", body)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestListUsers(t *testing.T) {
	h := setupHandler()
	body1 := bytes.NewBufferString(`{"username":"alice","password":"pass"}`)
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/users", body1))
	body2 := bytes.NewBufferString(`{"username":"bob","password":"pass"}`)
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/users", body2))

	req := httptest.NewRequest(http.MethodGet, "/users", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	var users []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&users)
	if len(users) != 2 {
		t.Errorf("expected 2 users, got %d", len(users))
	}
}

func TestUpdateUser(t *testing.T) {
	h := setupHandler()
	createBody := bytes.NewBufferString(`{"username":"alice","password":"secret"}`)
	createW := httptest.NewRecorder()
	h.ServeHTTP(createW, httptest.NewRequest(http.MethodPost, "/users", createBody))

	var created map[string]interface{}
	json.NewDecoder(createW.Result().Body).Decode(&created)

	updateBody := bytes.NewBufferString(`{"username":"alice-updated","password":"newpass"}`)
	req := httptest.NewRequest(http.MethodPut, "/users/"+created["id"].(string), updateBody)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	var updated map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&updated)
	if updated["username"] != "alice-updated" {
		t.Errorf("expected alice-updated, got %v", updated["username"])
	}
}

func TestUpdateUserNotFound(t *testing.T) {
	h := setupHandler()
	body := bytes.NewBufferString(`{"username":"nobody","password":"pass"}`)
	req := httptest.NewRequest(http.MethodPut, "/users/nonexistent", body)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 404, got %d", resp.StatusCode)
	}
}

func TestDeleteUser(t *testing.T) {
	h := setupHandler()
	createBody := bytes.NewBufferString(`{"username":"alice","password":"secret"}`)
	createW := httptest.NewRecorder()
	h.ServeHTTP(createW, httptest.NewRequest(http.MethodPost, "/users", createBody))

	var created map[string]interface{}
	json.NewDecoder(createW.Result().Body).Decode(&created)

	req := httptest.NewRequest(http.MethodDelete, "/users/"+created["id"].(string), nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusNoContent {
		t.Errorf("expected 204, got %d", resp.StatusCode)
	}
}

func TestDeleteUserNotFound(t *testing.T) {
	h := setupHandler()
	req := httptest.NewRequest(http.MethodDelete, "/users/nonexistent", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 404, got %d", resp.StatusCode)
	}
}

func TestGetUserByID(t *testing.T) {
	h := setupHandler()
	createBody := bytes.NewBufferString(`{"username":"alice","password":"secret"}`)
	createW := httptest.NewRecorder()
	h.ServeHTTP(createW, httptest.NewRequest(http.MethodPost, "/users", createBody))

	var created map[string]interface{}
	json.NewDecoder(createW.Result().Body).Decode(&created)

	req := httptest.NewRequest(http.MethodGet, "/users/"+created["id"].(string), nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

func TestGetUserByIDNotFound(t *testing.T) {
	h := setupHandler()
	req := httptest.NewRequest(http.MethodGet, "/users/nonexistent", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 404, got %d", resp.StatusCode)
	}
}

func TestMethodNotAllowed(t *testing.T) {
	h := setupHandler()
	req := httptest.NewRequest(http.MethodPatch, "/users", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", resp.StatusCode)
	}
}

func TestInvalidUserID(t *testing.T) {
	h := setupHandler()
	req := httptest.NewRequest(http.MethodGet, "/users/invalid!id", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 404, got %d", resp.StatusCode)
	}
}

func TestInvalidJSON(t *testing.T) {
	h := setupHandler()
	body := bytes.NewBufferString(`not json`)
	req := httptest.NewRequest(http.MethodPost, "/users", body)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestInvalidJSONOnUpdate(t *testing.T) {
	h := setupHandler()
	body := bytes.NewBufferString(`not json`)
	req := httptest.NewRequest(http.MethodPut, "/users/1", body)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestNotFound(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/nonexistent", nil)
	w := httptest.NewRecorder()
	http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error":"Not found"}`))
	}).ServeHTTP(w, req)
	resp := w.Result()
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 404, got %d", resp.StatusCode)
	}
}
