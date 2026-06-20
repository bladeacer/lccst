package tests

import (
	"testing"
	"go-login-crud-skill/internal/cache"
	"time"
)

func TestCacheSetGet(t *testing.T) {
	c := cache.NewCache(time.Minute)
	c.Set("key1", "value1")
	val, ok := c.Get("key1")
	if !ok {
		t.Error("expected ok")
	}
	if val != "value1" {
		t.Errorf("expected value1, got %v", val)
	}
}

func TestCacheGetMissing(t *testing.T) {
	c := cache.NewCache(time.Minute)
	_, ok := c.Get("nonexistent")
	if ok {
		t.Error("expected not ok for missing key")
	}
}

func TestCacheDelete(t *testing.T) {
	c := cache.NewCache(time.Minute)
	c.Set("key1", "value1")
	c.Delete("key1")
	_, ok := c.Get("key1")
	if ok {
		t.Error("expected not ok after delete")
	}
}

func TestCacheExpiration(t *testing.T) {
	c := cache.NewCache(50 * time.Millisecond)
	c.Set("key1", "value1")
	time.Sleep(100 * time.Millisecond)
	_, ok := c.Get("key1")
	if ok {
		t.Error("expected not ok after expiration")
	}
}
