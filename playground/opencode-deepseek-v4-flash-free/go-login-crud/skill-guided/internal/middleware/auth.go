package middleware

import (
	"net/http"
	"strings"

	"skill-guided-login-crud/internal/cache"
)

func AuthMiddleware(sessionCache cache.SessionCache) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := r.Header.Get("Authorization")
			if token == "" || !strings.HasPrefix(token, "Bearer ") {
				http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
				return
			}
			token = strings.TrimPrefix(token, "Bearer ")
			_, ok := sessionCache.Get(token)
			if !ok {
				http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
