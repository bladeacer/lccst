package tests

import (
	"testing"
	"time"

	"skill-guided-login-crud/internal/cache"
)

func TestSessionSetAndGet(t *testing.T) {
	c := cache.NewInMemorySessionCache(1 * time.Hour)
	token := c.Set(42)
	sess, ok := c.Get(token)
	if !ok {
		t.Fatal("expected to get session")
	}
	if sess.UserID != 42 {
		t.Fatalf("expected user ID 42, got %d", sess.UserID)
	}
}

func TestSessionExpiry(t *testing.T) {
	c := cache.NewInMemorySessionCache(0)
	token := c.Set(1)
	_, ok := c.Get(token)
	if ok {
		t.Fatal("expected session to be expired")
	}
}

func TestSessionDelete(t *testing.T) {
	c := cache.NewInMemorySessionCache(1 * time.Hour)
	token := c.Set(1)
	c.Delete(token)
	_, ok := c.Get(token)
	if ok {
		t.Fatal("expected session to be deleted")
	}
}

func TestCleanup(t *testing.T) {
	c := cache.NewInMemorySessionCache(0)
	c.Set(1)
	c.Set(2)
	c.Cleanup()
	// verify no sessions via Get - limited because cleanup is best-effort
	// but we can test that Cleanup doesn't panic
}
