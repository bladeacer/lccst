package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"go-login-crud-skill/internal/model"
	"go-login-crud-skill/internal/repository"
)

type UserHandler struct {
	repo *repository.UserRepository
}

func NewUserHandler(repo *repository.UserRepository) *UserHandler {
	return &UserHandler{repo: repo}
}

func (h *UserHandler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *UserHandler) HandleUsers(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		users := h.repo.GetAll()
		writeJSON(w, http.StatusOK, users)
	case http.MethodPost:
		var req model.CreateUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, model.ErrorResponse{Error: "Invalid JSON"})
			return
		}
		if req.Name == "" || req.Email == "" {
			writeJSON(w, http.StatusBadRequest, model.ErrorResponse{Error: "Name and email required"})
			return
		}
		user := h.repo.Create(req)
		writeJSON(w, http.StatusCreated, user)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, model.ErrorResponse{Error: "Method not allowed"})
	}
}

func (h *UserHandler) HandleUserByID(w http.ResponseWriter, r *http.Request) {
	id, err := extractID(r.URL.Path)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, model.ErrorResponse{Error: "Invalid user ID"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		user, ok := h.repo.GetByID(id)
		if !ok {
			writeJSON(w, http.StatusNotFound, model.ErrorResponse{Error: "Not found"})
			return
		}
		writeJSON(w, http.StatusOK, user)
	case http.MethodPut:
		var req model.UpdateUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, model.ErrorResponse{Error: "Invalid JSON"})
			return
		}
		user, ok := h.repo.Update(id, req)
		if !ok {
			writeJSON(w, http.StatusNotFound, model.ErrorResponse{Error: "Not found"})
			return
		}
		writeJSON(w, http.StatusOK, user)
	case http.MethodDelete:
		if ok := h.repo.Delete(id); !ok {
			writeJSON(w, http.StatusNotFound, model.ErrorResponse{Error: "Not found"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, model.ErrorResponse{Error: "Method not allowed"})
	}
}

func extractID(path string) (int, error) {
	parts := strings.Split(strings.TrimPrefix(path, "/users/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		return 0, strconv.ErrSyntax
	}
	return strconv.Atoi(parts[0])
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
