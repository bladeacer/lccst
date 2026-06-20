package main

import (
	"log"
	"net/http"

	"login-crud/internal/cache"
	"login-crud/internal/handler"
	"login-crud/internal/middleware"
	"login-crud/internal/repository"
)

func main() {
	repo := repository.NewInMemoryUserRepo()
	c := cache.NewInMemoryUserCache()
	h := handler.NewUserHandler(repo, c)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /register", h.Register)
	mux.HandleFunc("POST /login", h.Login)
	mux.HandleFunc("GET /users", h.ListUsers)
	mux.HandleFunc("GET /users/{id}", h.GetUser)
	mux.HandleFunc("PUT /users/{id}", h.UpdateUser)
	mux.HandleFunc("DELETE /users/{id}", h.DeleteUser)

	var wrapped http.Handler = mux
	wrapped = middleware.CORS(wrapped)
	wrapped = middleware.ContentType(wrapped)
	wrapped = middleware.Logging(wrapped)

	log.Fatal(http.ListenAndServe(":8000", wrapped))
}
