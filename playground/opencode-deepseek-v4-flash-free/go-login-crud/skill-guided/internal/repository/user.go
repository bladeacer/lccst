package repository

import (
	"sync"
	"go-login-crud-skill/internal/model"
)

type UserRepository struct {
	mu     sync.RWMutex
	users  []model.User
	nextID int
}

func NewUserRepository() *UserRepository {
	return &UserRepository{
		users:  make([]model.User, 0),
		nextID: 1,
	}
}

func (r *UserRepository) GetAll() []model.User {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]model.User, len(r.users))
	copy(result, r.users)
	return result
}

func (r *UserRepository) GetByID(id int) (model.User, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, u := range r.users {
		if u.ID == id {
			return u, true
		}
	}
	return model.User{}, false
}

func (r *UserRepository) Create(req model.CreateUserRequest) model.User {
	r.mu.Lock()
	defer r.mu.Unlock()
	u := model.User{
		ID:    r.nextID,
		Name:  req.Name,
		Email: req.Email,
	}
	r.nextID++
	r.users = append(r.users, u)
	return u
}

func (r *UserRepository) Update(id int, req model.UpdateUserRequest) (model.User, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, u := range r.users {
		if u.ID == id {
			if req.Name != nil {
				r.users[i].Name = *req.Name
			}
			if req.Email != nil {
				r.users[i].Email = *req.Email
			}
			return r.users[i], true
		}
	}
	return model.User{}, false
}

func (r *UserRepository) Delete(id int) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, u := range r.users {
		if u.ID == id {
			r.users = append(r.users[:i], r.users[i+1:]...)
			return true
		}
	}
	return false
}
