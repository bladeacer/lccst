package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
)

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"-"`
}

var (
	mu    sync.RWMutex
	users = map[int]User{}
	next  = 1
)

func hashPassword(pw string) string {
	h := sha256.Sum256([]byte(pw))
	return hex.EncodeToString(h[:])
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if body.Username == "" || body.Password == "" {
		writeError(w, 400, "username and password required")
		return
	}
	mu.Lock()
	defer mu.Unlock()
	for _, u := range users {
		if u.Username == body.Username {
			writeError(w, 409, "username already exists")
			return
		}
	}
	id := next
	next++
	users[id] = User{ID: id, Username: body.Username, Password: hashPassword(body.Password)}
	writeJSON(w, 201, map[string]interface{}{"id": id, "username": body.Username})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	mu.RLock()
	defer mu.RUnlock()
	for _, u := range users {
		if u.Username == body.Username && u.Password == hashPassword(body.Password) {
			writeJSON(w, 200, map[string]interface{}{"message": "login successful", "user_id": u.ID})
			return
		}
	}
	writeError(w, 401, "invalid credentials")
}

func listUsersHandler(w http.ResponseWriter, r *http.Request) {
	mu.RLock()
	defer mu.RUnlock()
	list := make([]User, 0, len(users))
	for _, u := range users {
		list = append(list, u)
	}
	writeJSON(w, 200, list)
}

func getUserHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, 400, "invalid user id")
		return
	}
	mu.RLock()
	u, ok := users[id]
	mu.RUnlock()
	if !ok {
		writeError(w, 404, "user not found")
		return
	}
	writeJSON(w, 200, u)
}

func updateUserHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, 400, "invalid user id")
		return
	}
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	mu.Lock()
	defer mu.Unlock()
	u, ok := users[id]
	if !ok {
		writeError(w, 404, "user not found")
		return
	}
	if body.Username != "" {
		for _, other := range users {
			if other.ID != id && other.Username == body.Username {
				writeError(w, 409, "username already taken")
				return
			}
		}
		u.Username = body.Username
	}
	if body.Password != "" {
		u.Password = hashPassword(body.Password)
	}
	users[id] = u
	writeJSON(w, 200, u)
}

func deleteUserHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, 400, "invalid user id")
		return
	}
	mu.Lock()
	defer mu.Unlock()
	if _, ok := users[id]; !ok {
		writeError(w, 404, "user not found")
		return
	}
	delete(users, id)
	writeJSON(w, 200, map[string]bool{"deleted": true})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /register", registerHandler)
	mux.HandleFunc("POST /login", loginHandler)
	mux.HandleFunc("GET /users", listUsersHandler)
	mux.HandleFunc("GET /users/{id}", getUserHandler)
	mux.HandleFunc("PUT /users/{id}", updateUserHandler)
	mux.HandleFunc("DELETE /users/{id}", deleteUserHandler)
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			writeError(w, 404, "not found")
			return
		}
		fmt.Fprintf(w, "Go Login CRUD API")
	})
	log.Fatal(http.ListenAndServe(":8000", loggingMiddleware(mux)))
}


