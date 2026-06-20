package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"login-crud/internal/cache"
	"login-crud/internal/model"
	"login-crud/internal/repository"
)

type UserHandler struct {
	repo  repository.UserRepository
	cache cache.UserCache
}

func NewUserHandler(repo repository.UserRepository, c cache.UserCache) *UserHandler {
	return &UserHandler{repo: repo, cache: c}
}

func (h *UserHandler) Register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	err := json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.Username == "" || body.Password == "" {
		writeError(w, http.StatusBadRequest, "username and password required")
		return
	}
	id := h.repo.NextID()
	user := model.NewUser(id, body.Username, body.Password)
	err = h.repo.Create(user)
	if err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	h.cache.Set(id, user)
	writeJSON(w, http.StatusCreated, map[string]interface{}{"id": id, "username": body.Username})
}

func (h *UserHandler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	err := json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	user, ok := h.repo.FindByUsername(body.Username)
	if !ok || user.Password != model.HashPassword(body.Password) {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"message": "login successful", "user_id": user.ID})
}

func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users := h.repo.List()
	writeJSON(w, http.StatusOK, users)
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	if user, ok := h.cache.Get(id); ok {
		writeJSON(w, http.StatusOK, user)
		return
	}
	user, ok := h.repo.FindByID(id)
	if !ok {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	h.cache.Set(id, user)
	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	err = json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	existing, ok := h.repo.FindByID(id)
	if !ok {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	if body.Username != "" {
		if existingUser, exists := h.repo.FindByUsername(body.Username); exists && existingUser.ID != id {
			writeError(w, http.StatusConflict, "username already taken")
			return
		}
		existing.Username = body.Username
	}
	if body.Password != "" {
		existing.Password = model.HashPassword(body.Password)
	}
	h.repo.Update(id, existing)
	h.cache.Set(id, existing)
	writeJSON(w, http.StatusOK, existing)
}

func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	if !h.repo.Delete(id) {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	h.cache.Delete(id)
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
