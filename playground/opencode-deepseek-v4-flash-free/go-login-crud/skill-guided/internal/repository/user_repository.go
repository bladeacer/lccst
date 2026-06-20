package repository

import (
	"crypto/sha256"
	"fmt"
	"sync"

	"skill-guided-login-crud/internal/model"
)

type UserRepository interface {
	Create(user model.User) model.User
	FindByUsername(username string) *model.User
	FindByID(id int) *model.User
	List() []model.User
	Update(id int, email string) (*model.User, error)
	Delete(id int) error
}

type InMemoryUserRepository struct {
	mu     sync.RWMutex
	users  []model.User
	nextID int
}

func NewInMemoryUserRepository() *InMemoryUserRepository {
	return &InMemoryUserRepository{nextID: 1}
}

func HashPassword(pwd string) string {
	h := sha256.Sum256([]byte(pwd))
	return fmt.Sprintf("%x", h)
}

func (r *InMemoryUserRepository) Create(user model.User) model.User {
	r.mu.Lock()
	defer r.mu.Unlock()
	user.ID = r.nextID
	r.nextID++
	user.Password = HashPassword(user.Password)
	r.users = append(r.users, user)
	return user
}

func (r *InMemoryUserRepository) FindByUsername(username string) *model.User {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for i := range r.users {
		if r.users[i].Username == username {
			return &r.users[i]
		}
	}
	return nil
}

func (r *InMemoryUserRepository) FindByID(id int) *model.User {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for i := range r.users {
		if r.users[i].ID == id {
			return &r.users[i]
		}
	}
	return nil
}

func (r *InMemoryUserRepository) List() []model.User {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]model.User, len(r.users))
	copy(result, r.users)
	return result
}

func (r *InMemoryUserRepository) Update(id int, email string) (*model.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.users {
		if r.users[i].ID == id {
			r.users[i].Email = email
			return &r.users[i], nil
		}
	}
	return nil, fmt.Errorf("user not found")
}

func (r *InMemoryUserRepository) Delete(id int) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.users {
		if r.users[i].ID == id {
			r.users = append(r.users[:i], r.users[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("user not found")
}
