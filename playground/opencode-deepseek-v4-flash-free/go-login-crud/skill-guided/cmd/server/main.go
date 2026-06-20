package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"go-login-crud/internal/handler"
	"go-login-crud/internal/middleware"
	"go-login-crud/internal/repository"
)

func main() {
	repo := repository.NewInMemory()
	userHandler := handler.NewUserHandler(repo)

	mux := http.NewServeMux()

	mux.HandleFunc("POST /users", userHandler.Create)
	mux.HandleFunc("GET /users/{id}", userHandler.Get)
	mux.HandleFunc("PUT /users/{id}", userHandler.Update)
	mux.HandleFunc("DELETE /users/{id}", userHandler.Delete)
	mux.HandleFunc("POST /login", userHandler.Login)

	rl := middleware.NewRateLimiter(100, time.Minute)
	var h http.Handler = rl.Middleware(mux)
	h = middleware.Logging(h)

	addr := ":8080"
	if a := strings.TrimSpace(os.Getenv("ADDR")); a != "" {
		addr = a
	}

	log.Printf("server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, h))
}
