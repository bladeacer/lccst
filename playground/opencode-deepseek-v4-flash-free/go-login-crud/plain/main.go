package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
)

var (
	users  []User
	nextID = 1
	mu     sync.Mutex
)

type User struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", handleHealth)
	mux.HandleFunc("/users", handleUsers)
	mux.HandleFunc("/users/", handleUserByID)

	port := os.Getenv("PORT")
	if port == "" {
		port = "18080"
	}

	log.Printf("Starting server on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func handleUsers(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		mu.Lock()
		defer mu.Unlock()
		writeJSON(w, 200, users)
	case http.MethodPost:
		var u User
		if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid JSON"})
			return
		}
		mu.Lock()
		u.ID = nextID
		nextID++
		users = append(users, u)
		mu.Unlock()
		writeJSON(w, 201, u)
	default:
		writeJSON(w, 405, map[string]string{"error": "Method not allowed"})
	}
}

func handleUserByID(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/users/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, 404, map[string]string{"error": "Not found"})
		return
	}

	id, err := strconv.Atoi(parts[0])
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": "Invalid user ID"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		mu.Lock()
		defer mu.Unlock()
		for _, u := range users {
			if u.ID == id {
				writeJSON(w, 200, u)
				return
			}
		}
		writeJSON(w, 404, map[string]string{"error": "Not found"})
	case http.MethodPut:
		var updated User
		if err := json.NewDecoder(r.Body).Decode(&updated); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid JSON"})
			return
		}
		mu.Lock()
		defer mu.Unlock()
		for i, u := range users {
			if u.ID == id {
				if updated.Name != "" {
					users[i].Name = updated.Name
				}
				if updated.Email != "" {
					users[i].Email = updated.Email
				}
				writeJSON(w, 200, users[i])
				return
			}
		}
		writeJSON(w, 404, map[string]string{"error": "Not found"})
	case http.MethodDelete:
		mu.Lock()
		defer mu.Unlock()
		for i, u := range users {
			if u.ID == id {
				users = append(users[:i], users[i+1:]...)
				writeJSON(w, 200, map[string]bool{"deleted": true})
				return
			}
		}
		writeJSON(w, 404, map[string]string{"error": "Not found"})
	default:
		writeJSON(w, 405, map[string]string{"error": "Method not allowed"})
	}
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
