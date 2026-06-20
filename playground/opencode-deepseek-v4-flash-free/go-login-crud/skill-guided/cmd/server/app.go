package main

import (
	"go-login-crud-skill/internal/cache"
	"go-login-crud-skill/internal/handler"
	"go-login-crud-skill/internal/middleware"
	"go-login-crud-skill/internal/repository"
	"net/http"
	"time"
)

type App struct {
	userHandler *handler.UserHandler
	cache       *cache.Cache
}

func NewApp() (*App, error) {
	repo := repository.NewUserRepository()
	c := cache.NewCache(5 * time.Minute)
	uh := handler.NewUserHandler(repo)
	return &App{
		userHandler: uh,
		cache:       c,
	}, nil
}

func (a *App) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", a.userHandler.Health)
	mux.HandleFunc("/users", a.userHandler.HandleUsers)
	mux.HandleFunc("/users/", a.userHandler.HandleUserByID)

	var h http.Handler = mux
	h = middleware.Recovery(h)
	h = middleware.Logger(h)
	return h
}
