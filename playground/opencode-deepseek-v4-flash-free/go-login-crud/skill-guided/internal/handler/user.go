package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"go-login-crud-skill/internal/model"
	"go-login-crud-skill/internal/repository"
)

type UserHandler struct {
	repo repository.UserRepository
}

func NewUserHandler(repo repository.UserRepository) *UserHandler {
	return &UserHandler{repo: repo}
}

func (h *UserHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	path := strings.TrimPrefix(r.URL.Path, "/users")
	path = strings.TrimPrefix(path, "/")

	switch r.Method {
	case http.MethodGet:
		if path == "" {
			h.listUsers(w, r)
		} else {
			h.getUser(w, r, path)
		}
	case http.MethodPost:
		h.createUser(w, r)
	case http.MethodPut:
		if path == "" {
			writeError(w, http.StatusNotFound, "Not found")
			return
		}
		h.updateUser(w, r, path)
	case http.MethodDelete:
		if path == "" {
			writeError(w, http.StatusNotFound, "Not found")
			return
		}
		h.deleteUser(w, r, path)
	default:
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func (h *UserHandler) listUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.repo.GetAll()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Internal error")
		return
	}
	writeJSON(w, http.StatusOK, users)
}

func (h *UserHandler) getUser(w http.ResponseWriter, r *http.Request, id string) {
	user, err := h.repo.GetByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, "User not found")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) createUser(w http.ResponseWriter, r *http.Request) {
	var req model.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	if err := req.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	user, err := h.repo.Create(req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Internal error")
		return
	}
	writeJSON(w, http.StatusCreated, user)
}

func (h *UserHandler) updateUser(w http.ResponseWriter, r *http.Request, id string) {
	var req model.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	if err := req.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	user, err := h.repo.Update(id, req)
	if err != nil {
		writeError(w, http.StatusNotFound, "User not found")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) deleteUser(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.repo.Delete(id); err != nil {
		writeError(w, http.StatusNotFound, "User not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
