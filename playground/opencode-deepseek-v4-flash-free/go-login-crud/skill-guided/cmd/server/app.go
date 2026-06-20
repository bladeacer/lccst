package main

import (
	"net/http"
	"time"

	"go-login-crud-skill/internal/cache"
	"go-login-crud-skill/internal/handler"
	"go-login-crud-skill/internal/middleware"
	"go-login-crud-skill/internal/repository"
)

type App struct {
	Server *http.Server
}

func NewApp() *App {
	repo := repository.NewInMemoryUserRepository()
	_ = cache.NewCache(5 * time.Minute)

	userHandler := handler.NewUserHandler(repo)

	mux := http.NewServeMux()
	mux.Handle("/users", userHandler)
	mux.Handle("/users/", userHandler)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	loggedMux := middleware.Logging(mux)

	return &App{
		Server: &http.Server{
			Addr:    ":8000",
			Handler: loggedMux,
		},
	}
}
