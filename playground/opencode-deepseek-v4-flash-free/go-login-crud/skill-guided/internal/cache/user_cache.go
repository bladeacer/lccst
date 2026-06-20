package cache

import (
	"login-crud/internal/model"
	"sync"
)

type UserCache interface {
	Get(id int) (model.User, bool)
	Set(id int, user model.User)
	Delete(id int)
	Clear()
}

type InMemoryUserCache struct {
	mu    sync.RWMutex
	users map[int]model.User
}

func NewInMemoryUserCache() *InMemoryUserCache {
	return &InMemoryUserCache{
		users: make(map[int]model.User),
	}
}

func (c *InMemoryUserCache) Get(id int) (model.User, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	u, ok := c.users[id]
	return u, ok
}

func (c *InMemoryUserCache) Set(id int, user model.User) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.users[id] = user
}

func (c *InMemoryUserCache) Delete(id int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.users, id)
}

func (c *InMemoryUserCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.users = make(map[int]model.User)
}
