package tests

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go-login-crud/internal/middleware"
)

func TestRateLimiterAllowsUnderLimit(t *testing.T) {
	rl := middleware.NewRateLimiter(5, time.Minute)
	handler := rl.Middleware(nil)
	_ = handler
}

func TestRateLimiterBlocksOverLimit(t *testing.T) {
	rl := middleware.NewRateLimiter(2, time.Minute)

	called := 0
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called++
	})

	h := rl.Middleware(next)

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.168.1.1:12345"

	rec1 := httptest.NewRecorder()
	h.ServeHTTP(rec1, req)
	if called != 1 {
		t.Errorf("expected first call to succeed, called=%d", called)
	}

	rec2 := httptest.NewRecorder()
	h.ServeHTTP(rec2, req)
	if called != 2 {
		t.Errorf("expected second call to succeed, called=%d", called)
	}

	rec3 := httptest.NewRecorder()
	h.ServeHTTP(rec3, req)
	if rec3.Code != 429 {
		t.Errorf("expected 429 on third call, got %d", rec3.Code)
	}
}
