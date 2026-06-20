package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
)

type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Password string `json:"-"`
}

type store struct {
	mu    sync.RWMutex
	users map[string]User
}

func newStore() *store {
	return &store{users: make(map[string]User)}
}

func hashPassword(password string) string {
	h := sha256.Sum256([]byte(password))
	return hex.EncodeToString(h[:])
}

func (s *store) create(username, password string) (User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, u := range s.users {
		if u.Username == username {
			return User{}, fmt.Errorf("user already exists")
		}
	}
	id := fmt.Sprintf("%d", len(s.users)+1)
	user := User{ID: id, Username: username, Password: hashPassword(password)}
	s.users[id] = user
	return user, nil
}

func (s *store) get(id string) (User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.users[id]
	return u, ok
}

func (s *store) update(id, username, password string) (User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[id]
	if !ok {
		return User{}, fmt.Errorf("user not found")
	}
	if username != "" {
		u.Username = username
	}
	if password != "" {
		u.Password = hashPassword(password)
	}
	s.users[id] = u
	return u, nil
}

func (s *store) delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.users[id]; !ok {
		return fmt.Errorf("user not found")
	}
	delete(s.users, id)
	return nil
}

func (s *store) login(username, password string) (User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, u := range s.users {
		if u.Username == username && u.Password == hashPassword(password) {
			return u, true
		}
	}
	return User{}, false
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func main() {
	s := newStore()
	mux := http.NewServeMux()

	mux.HandleFunc("POST /users", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON")
			return
		}
		if body.Username == "" || body.Password == "" {
			writeError(w, http.StatusBadRequest, "username and password required")
			return
		}
		user, err := s.create(body.Username, body.Password)
		if err != nil {
			writeError(w, http.StatusConflict, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, user)
	})

	mux.HandleFunc("GET /users/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		user, ok := s.get(id)
		if !ok {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		writeJSON(w, http.StatusOK, user)
	})

	mux.HandleFunc("PUT /users/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		var body struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON")
			return
		}
		user, err := s.update(id, body.Username, body.Password)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, user)
	})

	mux.HandleFunc("DELETE /users/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if err := s.delete(id); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	mux.HandleFunc("POST /login", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON")
			return
		}
		user, ok := s.login(body.Username, body.Password)
		if !ok {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		writeJSON(w, http.StatusOK, user)
	})

	addr := ":8080"
	if a := strings.TrimSpace(os.Getenv("ADDR")); a != "" {
		addr = a
	}

	log.Printf("server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
