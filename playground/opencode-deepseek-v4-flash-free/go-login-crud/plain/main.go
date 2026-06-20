package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
)

type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Password string `json:"-"`
}

type Store struct {
	mu    sync.RWMutex
	users map[string]User
}

var store = &Store{users: make(map[string]User)}

func hashPassword(password string) string {
	h := sha256.Sum256([]byte(password))
	return hex.EncodeToString(h[:])
}

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		path := strings.TrimPrefix(r.URL.Path, "/")
		parts := strings.Split(path, "/")

		if path == "health" && r.Method == "GET" {
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
			return
		}
		if parts[0] == "users" {
			switch r.Method {
			case "GET":
				if len(parts) == 2 {
					store.mu.RLock()
					user, ok := store.users[parts[1]]
					store.mu.RUnlock()
					if !ok {
						w.WriteHeader(404)
						json.NewEncoder(w).Encode(map[string]string{"error": "Not found"})
						return
					}
					json.NewEncoder(w).Encode(user)
				} else {
					store.mu.RLock()
					list := make([]User, 0, len(store.users))
					for _, u := range store.users {
						list = append(list, u)
					}
					store.mu.RUnlock()
					json.NewEncoder(w).Encode(list)
				}
			case "POST":
				var input struct {
					Username string `json:"username"`
					Password string `json:"password"`
				}
				if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
					w.WriteHeader(400)
					json.NewEncoder(w).Encode(map[string]string{"error": "Invalid JSON"})
					return
				}
				id := fmt.Sprintf("%d", len(store.users)+1)
				user := User{ID: id, Username: input.Username, Password: hashPassword(input.Password)}
				store.mu.Lock()
				store.users[id] = user
				store.mu.Unlock()
				w.WriteHeader(201)
				json.NewEncoder(w).Encode(user)
			case "PUT":
				if len(parts) != 2 {
					w.WriteHeader(404)
					json.NewEncoder(w).Encode(map[string]string{"error": "Not found"})
					return
				}
				var input struct {
					Username string `json:"username"`
					Password string `json:"password"`
				}
				if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
					w.WriteHeader(400)
					json.NewEncoder(w).Encode(map[string]string{"error": "Invalid JSON"})
					return
				}
				store.mu.Lock()
				user, ok := store.users[parts[1]]
				if ok {
					user.Username = input.Username
					user.Password = hashPassword(input.Password)
					store.users[parts[1]] = user
				}
				store.mu.Unlock()
				if !ok {
					w.WriteHeader(404)
					json.NewEncoder(w).Encode(map[string]string{"error": "Not found"})
					return
				}
				json.NewEncoder(w).Encode(user)
			case "DELETE":
				if len(parts) != 2 {
					w.WriteHeader(404)
					json.NewEncoder(w).Encode(map[string]string{"error": "Not found"})
					return
				}
				store.mu.Lock()
				_, ok := store.users[parts[1]]
				if ok {
					delete(store.users, parts[1])
				}
				store.mu.Unlock()
				if !ok {
					w.WriteHeader(404)
					json.NewEncoder(w).Encode(map[string]string{"error": "Not found"})
					return
				}
				w.WriteHeader(204)
			default:
				w.WriteHeader(405)
				json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
			}
			return
		}
		w.WriteHeader(404)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not found"})
	})
	log.Fatal(http.ListenAndServe(":8000", nil))
}
