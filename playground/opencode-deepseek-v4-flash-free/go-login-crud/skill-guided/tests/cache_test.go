package tests

import (
	"testing"
	"time"

	"go-login-crud-skill/internal/cache"
)

func TestCacheSetGet(t *testing.T) {
	c := cache.NewCache(5 * time.Second)
	c.Set("key1", "value1")
	val, ok := c.Get("key1")
	if !ok {
		t.Error("expected key1 to exist")
	}
	if val != "value1" {
		t.Errorf("expected value1, got %v", val)
	}
}

func TestCacheGetMissing(t *testing.T) {
	c := cache.NewCache(5 * time.Second)
	_, ok := c.Get("missing")
	if ok {
		t.Error("expected missing key to not be found")
	}
}

func TestCacheDelete(t *testing.T) {
	c := cache.NewCache(5 * time.Second)
	c.Set("key1", "value1")
	c.Delete("key1")
	_, ok := c.Get("key1")
	if ok {
		t.Error("expected key1 to be deleted")
	}
}

func TestCacheExpiration(t *testing.T) {
	c := cache.NewCache(100 * time.Millisecond)
	c.Set("key1", "value1")
	time.Sleep(200 * time.Millisecond)
	_, ok := c.Get("key1")
	if ok {
		t.Error("expected key1 to expire")
	}
}
