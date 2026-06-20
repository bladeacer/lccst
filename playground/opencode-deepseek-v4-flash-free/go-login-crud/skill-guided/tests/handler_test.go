package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go-login-crud/internal/handler"
	"go-login-crud/internal/repository"
)

func setupHandler() *handler.UserHandler {
	return handler.NewUserHandler(repository.NewInMemory())
}

func TestCreateUserHandler(t *testing.T) {
	h := setupHandler()
	body := `{"username":"testuser","password":"testpass"}`
	req := httptest.NewRequest("POST", "/users", strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.Create(rec, req)

	if rec.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", rec.Code)
	}

	var resp map[string]any
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp["username"] != "testuser" {
		t.Errorf("expected username testuser, got %v", resp["username"])
	}
	if _, ok := resp["password"]; ok {
		t.Error("password field should not appear in JSON response")
	}
}

func TestCreateUserHandlerMissingFields(t *testing.T) {
	h := setupHandler()
	body := `{"username":""}`
	req := httptest.NewRequest("POST", "/users", strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.Create(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

func TestGetUserHandler(t *testing.T) {
	h := setupHandler()
	createBody := `{"username":"alice","password":"pass"}`
	creq := httptest.NewRequest("POST", "/users", strings.NewReader(createBody))
	crec := httptest.NewRecorder()
	h.Create(crec, creq)

	var created map[string]any
	json.NewDecoder(crec.Body).Decode(&created)
	id := created["id"].(string)

	req := httptest.NewRequest("GET", "/users/"+id, nil)
	req.SetPathValue("id", id)
	rec := httptest.NewRecorder()
	h.Get(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}

	var resp map[string]any
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp["username"] != "alice" {
		t.Errorf("expected username alice, got %v", resp["username"])
	}
}

func TestGetUserHandlerNotFound(t *testing.T) {
	h := setupHandler()
	req := httptest.NewRequest("GET", "/users/nonexistent", nil)
	req.SetPathValue("id", "nonexistent")
	rec := httptest.NewRecorder()
	h.Get(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rec.Code)
	}
}

func TestUpdateUserHandler(t *testing.T) {
	h := setupHandler()
	createBody := `{"username":"bob","password":"pass"}`
	creq := httptest.NewRequest("POST", "/users", strings.NewReader(createBody))
	crec := httptest.NewRecorder()
	h.Create(crec, creq)

	var created map[string]any
	json.NewDecoder(crec.Body).Decode(&created)
	id := created["id"].(string)

	updateBody := `{"username":"bob_updated"}`
	ureq := httptest.NewRequest("PUT", "/users/"+id, strings.NewReader(updateBody))
	ureq.SetPathValue("id", id)
	urec := httptest.NewRecorder()
	h.Update(urec, ureq)

	if urec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", urec.Code)
	}

	var resp map[string]any
	json.NewDecoder(urec.Body).Decode(&resp)
	if resp["username"] != "bob_updated" {
		t.Errorf("expected username bob_updated, got %v", resp["username"])
	}
}

func TestDeleteUserHandler(t *testing.T) {
	h := setupHandler()
	createBody := `{"username":"carol","password":"pass"}`
	creq := httptest.NewRequest("POST", "/users", strings.NewReader(createBody))
	crec := httptest.NewRecorder()
	h.Create(crec, creq)

	var created map[string]any
	json.NewDecoder(crec.Body).Decode(&created)
	id := created["id"].(string)

	dreq := httptest.NewRequest("DELETE", "/users/"+id, nil)
	dreq.SetPathValue("id", id)
	drec := httptest.NewRecorder()
	h.Delete(drec, dreq)

	if drec.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", drec.Code)
	}
}

func TestLoginHandler(t *testing.T) {
	h := setupHandler()
	createBody := `{"username":"dave","password":"secret"}`
	creq := httptest.NewRequest("POST", "/users", strings.NewReader(createBody))
	crec := httptest.NewRecorder()
	h.Create(crec, creq)

	loginBody := `{"username":"dave","password":"secret"}`
	lreq := httptest.NewRequest("POST", "/login", strings.NewReader(loginBody))
	lrec := httptest.NewRecorder()
	h.Login(lrec, lreq)

	if lrec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", lrec.Code)
	}
}

func TestLoginHandlerInvalid(t *testing.T) {
	h := setupHandler()
	createBody := `{"username":"dave","password":"secret"}`
	creq := httptest.NewRequest("POST", "/users", strings.NewReader(createBody))
	crec := httptest.NewRecorder()
	h.Create(crec, creq)

	loginBody := `{"username":"dave","password":"wrong"}`
	lreq := httptest.NewRequest("POST", "/login", strings.NewReader(loginBody))
	lrec := httptest.NewRecorder()
	h.Login(lrec, lreq)

	if lrec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", lrec.Code)
	}
}

func TestPasswordNotInJSONResponse(t *testing.T) {
	repo := repository.NewInMemory()
	repo.Create("frank", "secret")
	h2 := handler.NewUserHandler(repo)

	createBody := `{"username":"frank","password":"secret"}`
	req := httptest.NewRequest("POST", "/users", strings.NewReader(createBody))
	rec := httptest.NewRecorder()
	h2.Create(rec, req)

	var resp map[string]any
	json.NewDecoder(rec.Body).Decode(&resp)
	if _, ok := resp["password"]; ok {
		t.Error("password key should not appear in JSON response")
	}
}
