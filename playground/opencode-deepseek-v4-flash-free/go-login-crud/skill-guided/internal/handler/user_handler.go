package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"skill-guided-login-crud/internal/cache"
	"skill-guided-login-crud/internal/model"
	"skill-guided-login-crud/internal/repository"
)

type UserHandler struct {
	repo         repository.UserRepository
	sessionCache cache.SessionCache
}

func NewUserHandler(repo repository.UserRepository, sessionCache cache.SessionCache) *UserHandler {
	return &UserHandler{repo: repo, sessionCache: sessionCache}
}

func (h *UserHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req model.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, model.ErrorResponse{Error: "Invalid JSON"})
		return
	}
	if req.Username == "" || req.Password == "" || req.Email == "" {
		writeJSON(w, http.StatusBadRequest, model.ErrorResponse{Error: "Username, password, email required"})
		return
	}
	user := h.repo.Create(model.User{
		Username: req.Username,
		Password: req.Password,
		Email:    req.Email,
	})
	writeJSON(w, http.StatusCreated, user)
}

func (h *UserHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, model.ErrorResponse{Error: "Invalid JSON"})
		return
	}
	user := h.repo.FindByUsername(req.Username)
	if user == nil || user.Password != repository.HashPassword(req.Password) {
		writeJSON(w, http.StatusUnauthorized, model.ErrorResponse{Error: "Invalid credentials"})
		return
	}
	token := h.sessionCache.Set(user.ID)
	writeJSON(w, http.StatusOK, model.LoginResponse{Token: token})
}

func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users := h.repo.List()
	writeJSON(w, http.StatusOK, users)
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/users/"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, model.ErrorResponse{Error: "Invalid ID"})
		return
	}
	user := h.repo.FindByID(id)
	if user == nil {
		writeJSON(w, http.StatusNotFound, model.ErrorResponse{Error: "Not found"})
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/users/"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, model.ErrorResponse{Error: "Invalid ID"})
		return
	}
	var req model.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, model.ErrorResponse{Error: "Invalid JSON"})
		return
	}
	user, err := h.repo.Update(id, req.Email)
	if err != nil {
		writeJSON(w, http.StatusNotFound, model.ErrorResponse{Error: "Not found"})
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/users/"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, model.ErrorResponse{Error: "Invalid ID"})
		return
	}
	if err := h.repo.Delete(id); err != nil {
		writeJSON(w, http.StatusNotFound, model.ErrorResponse{Error: "Not found"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
