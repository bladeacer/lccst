package repository

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sync"

	"go-login-crud-skill/internal/model"
)

type UserRepository interface {
	Create(req model.CreateUserRequest) (*model.User, error)
	GetByID(id string) (*model.User, error)
	GetAll() ([]model.User, error)
	Update(id string, req model.UpdateUserRequest) (*model.User, error)
	Delete(id string) error
}

type InMemoryUserRepository struct {
	mu    sync.RWMutex
	users map[string]model.User
	next  int
}

func NewInMemoryUserRepository() *InMemoryUserRepository {
	return &InMemoryUserRepository{users: make(map[string]model.User)}
}

func (r *InMemoryUserRepository) hashPassword(password string) string {
	h := sha256.Sum256([]byte(password))
	return hex.EncodeToString(h[:])
}

func (r *InMemoryUserRepository) Create(req model.CreateUserRequest) (*model.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.next++
	id := fmt.Sprintf("%d", r.next)
	user := model.User{
		ID:       id,
		Username: req.Username,
		Password: r.hashPassword(req.Password),
	}
	r.users[id] = user
	return &user, nil
}

func (r *InMemoryUserRepository) GetByID(id string) (*model.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	user, ok := r.users[id]
	if !ok {
		return nil, fmt.Errorf("user not found")
	}
	return &user, nil
}

func (r *InMemoryUserRepository) GetAll() ([]model.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]model.User, 0, len(r.users))
	for _, u := range r.users {
		result = append(result, u)
	}
	return result, nil
}

func (r *InMemoryUserRepository) Update(id string, req model.UpdateUserRequest) (*model.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	user, ok := r.users[id]
	if !ok {
		return nil, fmt.Errorf("user not found")
	}
	user.Username = req.Username
	user.Password = r.hashPassword(req.Password)
	r.users[id] = user
	return &user, nil
}

func (r *InMemoryUserRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.users[id]; !ok {
		return fmt.Errorf("user not found")
	}
	delete(r.users, id)
	return nil
}
