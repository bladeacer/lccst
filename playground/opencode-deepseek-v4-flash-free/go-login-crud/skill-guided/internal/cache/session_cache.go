package cache

import (
	"crypto/sha256"
	"fmt"
	"sync"
	"time"
)

type Session struct {
	Token   string
	UserID  int
	Expires time.Time
}

type SessionCache interface {
	Set(userID int) string
	Get(token string) (Session, bool)
	Delete(token string)
	Cleanup()
}

type InMemorySessionCache struct {
	mu       sync.RWMutex
	sessions map[string]Session
	ttl      time.Duration
}

func NewInMemorySessionCache(ttl time.Duration) *InMemorySessionCache {
	return &InMemorySessionCache{
		sessions: make(map[string]Session),
		ttl:      ttl,
	}
}

func generateToken() string {
	h := sha256.Sum256([]byte(fmt.Sprintf("%d", time.Now().UnixNano())))
	return fmt.Sprintf("%x", h)
}

func (c *InMemorySessionCache) Set(userID int) string {
	c.mu.Lock()
	defer c.mu.Unlock()
	token := generateToken()
	c.sessions[token] = Session{
		Token:   token,
		UserID:  userID,
		Expires: time.Now().Add(c.ttl),
	}
	return token
}

func (c *InMemorySessionCache) Get(token string) (Session, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	sess, ok := c.sessions[token]
	if !ok {
		return Session{}, false
	}
	if time.Now().After(sess.Expires) {
		return Session{}, false
	}
	return sess, true
}

func (c *InMemorySessionCache) Delete(token string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.sessions, token)
}

func (c *InMemorySessionCache) Cleanup() {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := time.Now()
	for k, v := range c.sessions {
		if now.After(v.Expires) {
			delete(c.sessions, k)
		}
	}
}
