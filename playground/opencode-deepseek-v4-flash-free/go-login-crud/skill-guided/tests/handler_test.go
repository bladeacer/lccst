package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"skill-guided-login-crud/internal/cache"
	"skill-guided-login-crud/internal/handler"
	"skill-guided-login-crud/internal/middleware"
	"skill-guided-login-crud/internal/model"
	"skill-guided-login-crud/internal/repository"
)

func setupHandler() (*handler.UserHandler, *cache.InMemorySessionCache, *repository.InMemoryUserRepository) {
	repo := repository.NewInMemoryUserRepository()
	sessCache := cache.NewInMemorySessionCache(1 * time.Hour)
	h := handler.NewUserHandler(repo, sessCache)
	return h, sessCache, repo
}

func TestRegister(t *testing.T) {
	h, _, _ := setupHandler()
	body, _ := json.Marshal(model.CreateUserRequest{Username: "newuser", Password: "pass", Email: "n@t.com"})
	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.Register(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", rec.Code)
	}
	var u model.User
	json.NewDecoder(rec.Body).Decode(&u)
	if u.Username != "newuser" {
		t.Fatalf("expected newuser, got %s", u.Username)
	}
}

func TestRegisterMissingFields(t *testing.T) {
	h, _, _ := setupHandler()
	body, _ := json.Marshal(model.CreateUserRequest{Username: "", Password: "", Email: ""})
	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.Register(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestRegisterInvalidJSON(t *testing.T) {
	h, _, _ := setupHandler()
	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewReader([]byte("not json")))
	rec := httptest.NewRecorder()
	h.Register(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestLoginSuccess(t *testing.T) {
	h, sessCache, repo := setupHandler()
	repo.Create(model.User{Username: "testuser", Password: "pass", Email: "t@t.com"})
	body, _ := json.Marshal(model.LoginRequest{Username: "testuser", Password: "pass"})
	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.Login(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var resp model.LoginResponse
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp.Token == "" {
		t.Fatal("expected non-empty token")
	}
	_, ok := sessCache.Get(resp.Token)
	if !ok {
		t.Fatal("session should exist")
	}
}

func TestLoginInvalidCredentials(t *testing.T) {
	h, _, repo := setupHandler()
	repo.Create(model.User{Username: "u", Password: "pass", Email: "u@t.com"})
	body, _ := json.Marshal(model.LoginRequest{Username: "u", Password: "wrong"})
	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.Login(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestHandlerListUsers(t *testing.T) {
	h, _, repo := setupHandler()
	repo.Create(model.User{Username: "a", Password: "p", Email: "a@t.com"})
	repo.Create(model.User{Username: "b", Password: "p", Email: "b@t.com"})
	req := httptest.NewRequest(http.MethodGet, "/users", nil)
	rec := httptest.NewRecorder()
	h.ListUsers(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var users []model.User
	json.NewDecoder(rec.Body).Decode(&users)
	if len(users) != 2 {
		t.Fatalf("expected 2 users, got %d", len(users))
	}
}

func TestGetUser(t *testing.T) {
	h, _, repo := setupHandler()
	u := repo.Create(model.User{Username: "u", Password: "p", Email: "u@t.com"})
	req := httptest.NewRequest(http.MethodGet, "/users/1", nil)
	rec := httptest.NewRecorder()
	h.GetUser(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	// test not found
	req2 := httptest.NewRequest(http.MethodGet, "/users/999", nil)
	rec2 := httptest.NewRecorder()
	h.GetUser(rec2, req2)
	if rec2.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec2.Code)
	}
	if u.ID != 1 {
		t.Fatalf("expected ID 1, got %d", u.ID)
	}
}

func TestHandlerUpdateUser(t *testing.T) {
	h, _, repo := setupHandler()
	repo.Create(model.User{Username: "u", Password: "p", Email: "old@t.com"})
	body, _ := json.Marshal(model.UpdateUserRequest{Email: "new@t.com"})
	req := httptest.NewRequest(http.MethodPut, "/users/1", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.UpdateUser(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	// test not found
	body2, _ := json.Marshal(model.UpdateUserRequest{Email: "x@t.com"})
	req2 := httptest.NewRequest(http.MethodPut, "/users/999", bytes.NewReader(body2))
	rec2 := httptest.NewRecorder()
	h.UpdateUser(rec2, req2)
	if rec2.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec2.Code)
	}
}

func TestHandlerDeleteUser(t *testing.T) {
	h, _, repo := setupHandler()
	repo.Create(model.User{Username: "u", Password: "p", Email: "u@t.com"})
	req := httptest.NewRequest(http.MethodDelete, "/users/1", nil)
	rec := httptest.NewRecorder()
	h.DeleteUser(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if repo.FindByID(1) != nil {
		t.Fatal("user should be deleted")
	}
	// test not found
	req2 := httptest.NewRequest(http.MethodDelete, "/users/999", nil)
	rec2 := httptest.NewRecorder()
	h.DeleteUser(rec2, req2)
	if rec2.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec2.Code)
	}
}

func TestHandlerAuthMiddlewareBlocksUnauthenticated(t *testing.T) {
	_, sessCache, _ := setupHandler()
	mw := middleware.AuthMiddleware(sessCache)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/users", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}
