package main

import (
	"log"
	"net/http"
	"time"

	"skill-guided-login-crud/internal/cache"
	"skill-guided-login-crud/internal/handler"
	"skill-guided-login-crud/internal/middleware"
	"skill-guided-login-crud/internal/repository"
)

func main() {
	userRepo := repository.NewInMemoryUserRepository()
	sessionCache := cache.NewInMemorySessionCache(1 * time.Hour)
	userHandler := handler.NewUserHandler(userRepo, sessionCache)
	authMw := middleware.AuthMiddleware(sessionCache)

	mux := http.NewServeMux()
	mux.HandleFunc("/register", userHandler.Register)
	mux.HandleFunc("/login", userHandler.Login)

	protected := http.NewServeMux()
	protected.HandleFunc("/users", userHandler.ListUsers)
	protected.HandleFunc("/users/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			userHandler.GetUser(w, r)
		case http.MethodPut:
			userHandler.UpdateUser(w, r)
		case http.MethodDelete:
			userHandler.DeleteUser(w, r)
		default:
			http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		}
	})
	mux.Handle("/users", authMw(protected))
	mux.Handle("/users/", authMw(protected))

	log.Println("Server on :18080")
	log.Fatal(http.ListenAndServe(":18080", mux))
}
