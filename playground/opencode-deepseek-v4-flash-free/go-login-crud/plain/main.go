package main

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"-"`
	Email    string `json:"email"`
}

type Session struct {
	Token   string
	UserID  int
	Expires time.Time
}

var (
	mu         sync.RWMutex
	users      = []User{}
	nextID     = 1
	sessions   = map[string]Session{}
)

func hashPassword(pwd string) string {
	h := sha256.Sum256([]byte(pwd))
	return fmt.Sprintf("%x", h)
}

func generateToken() string {
	h := sha256.Sum256([]byte(fmt.Sprintf("%d", time.Now().UnixNano())))
	return fmt.Sprintf("%x", h)
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		if token == "" || !strings.HasPrefix(token, "Bearer ") {
			jsonError(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		token = strings.TrimPrefix(token, "Bearer ")
		mu.RLock()
		sess, ok := sessions[token]
		mu.RUnlock()
		if !ok || time.Now().After(sess.Expires) {
			if ok {
				mu.Lock()
				delete(sessions, token)
				mu.Unlock()
			}
			jsonError(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var u User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if u.Username == "" || u.Password == "" || u.Email == "" {
		jsonError(w, "Username, password, email required", http.StatusBadRequest)
		return
	}
	mu.Lock()
	u.ID = nextID
	nextID++
	u.Password = hashPassword(u.Password)
	users = append(users, u)
	mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(u)
}

func login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var creds struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	mu.RLock()
	var found *User
	for i := range users {
		if users[i].Username == creds.Username {
			found = &users[i]
			break
		}
	}
	mu.RUnlock()
	if found == nil || found.Password != hashPassword(creds.Password) {
		jsonError(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}
	token := generateToken()
	mu.Lock()
	sessions[token] = Session{Token: token, UserID: found.ID, Expires: time.Now().Add(1 * time.Hour)}
	mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func listUsers(w http.ResponseWriter, r *http.Request) {
	mu.RLock()
	result := make([]User, len(users))
	copy(result, users)
	mu.RUnlock()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func getUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/users/"))
	if err != nil {
		jsonError(w, "Invalid ID", http.StatusBadRequest)
		return
	}
	mu.RLock()
	var found *User
	for i := range users {
		if users[i].ID == id {
			found = &users[i]
			break
		}
	}
	mu.RUnlock()
	if found == nil {
		jsonError(w, "Not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(found)
}

func updateUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/users/"))
	if err != nil {
		jsonError(w, "Invalid ID", http.StatusBadRequest)
		return
	}
	var updates struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		jsonError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	mu.Lock()
	var found *User
	for i := range users {
		if users[i].ID == id {
			found = &users[i]
			break
		}
	}
	if found != nil && updates.Email != "" {
		found.Email = updates.Email
	}
	mu.Unlock()
	if found == nil {
		jsonError(w, "Not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(found)
}

func deleteUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/users/"))
	if err != nil {
		jsonError(w, "Invalid ID", http.StatusBadRequest)
		return
	}
	mu.Lock()
	idx := -1
	for i := range users {
		if users[i].ID == id {
			idx = i
			break
		}
	}
	if idx >= 0 {
		users = append(users[:idx], users[idx+1:]...)
	}
	mu.Unlock()
	if idx < 0 {
		jsonError(w, "Not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"deleted": true})
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/register", register)
	mux.HandleFunc("/login", login)
	mux.HandleFunc("/users", authMiddleware(listUsers))
	mux.HandleFunc("/users/", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			getUser(w, r)
		case http.MethodPut:
			updateUser(w, r)
		case http.MethodDelete:
			deleteUser(w, r)
		default:
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	log.Println("Server on :18080")
	log.Fatal(http.ListenAndServe(":18080", mux))
}
