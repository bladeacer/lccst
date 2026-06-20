package middleware

import (
	"log"
	"net/http"
	"sync"
	"time"
)

func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

type RateLimiter struct {
	mu       sync.Mutex
	clients  map[string]int
	limit    int
	window   time.Duration
	lastClean time.Time
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		clients:   make(map[string]int),
		limit:     limit,
		window:    window,
		lastClean: time.Now(),
	}
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rl.mu.Lock()
		if time.Since(rl.lastClean) > rl.window {
			rl.clients = make(map[string]int)
			rl.lastClean = time.Now()
		}
		ip := r.RemoteAddr
		rl.clients[ip]++
		count := rl.clients[ip]
		rl.mu.Unlock()

		if count > rl.limit {
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
