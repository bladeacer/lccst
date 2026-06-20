package repository

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sync"

	"go-login-crud/internal/model"
)

type Repository interface {
	Create(username, password string) (model.User, error)
	Get(id string) (model.User, bool)
	Update(id, username, password string) (model.User, error)
	Delete(id string) error
	Login(username, password string) (model.User, bool)
}

type InMemory struct {
	mu    sync.RWMutex
	users map[string]model.User
	seq   int
}

func NewInMemory() *InMemory {
	return &InMemory{users: make(map[string]model.User)}
}

func hashPassword(password string) string {
	h := sha256.Sum256([]byte(password))
	return hex.EncodeToString(h[:])
}

func (r *InMemory) Create(username, password string) (model.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, u := range r.users {
		if u.Username == username {
			return model.User{}, fmt.Errorf("user already exists")
		}
	}
	r.seq++
	id := fmt.Sprintf("%d", r.seq)
	user := model.User{ID: id, Username: username, Password: hashPassword(password)}
	r.users[id] = user
	return user, nil
}

func (r *InMemory) Get(id string) (model.User, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	u, ok := r.users[id]
	return u, ok
}

func (r *InMemory) Update(id, username, password string) (model.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	u, ok := r.users[id]
	if !ok {
		return model.User{}, fmt.Errorf("user not found")
	}
	if username != "" {
		u.Username = username
	}
	if password != "" {
		u.Password = hashPassword(password)
	}
	r.users[id] = u
	return u, nil
}

func (r *InMemory) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.users[id]; !ok {
		return fmt.Errorf("user not found")
	}
	delete(r.users, id)
	return nil
}

func (r *InMemory) Login(username, password string) (model.User, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, u := range r.users {
		if u.Username == username && u.Password == hashPassword(password) {
			return u, true
		}
	}
	return model.User{}, false
}
