package repository

import (
	"login-crud/internal/model"
	"sync"
)

type UserRepository interface {
	Create(user model.User) error
	FindByID(id int) (model.User, bool)
	FindByUsername(username string) (model.User, bool)
	List() []model.User
	Update(id int, user model.User) bool
	Delete(id int) bool
	NextID() int
}

type InMemoryUserRepo struct {
	mu    sync.RWMutex
	users map[int]model.User
	next  int
}

func NewInMemoryUserRepo() *InMemoryUserRepo {
	return &InMemoryUserRepo{
		users: make(map[int]model.User),
		next:  1,
	}
}

func (r *InMemoryUserRepo) Create(user model.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, u := range r.users {
		if u.Username == user.Username {
			return ErrDuplicateUsername
		}
	}
	r.users[user.ID] = user
	return nil
}

func (r *InMemoryUserRepo) FindByID(id int) (model.User, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	u, ok := r.users[id]
	return u, ok
}

func (r *InMemoryUserRepo) FindByUsername(username string) (model.User, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, u := range r.users {
		if u.Username == username {
			return u, true
		}
	}
	return model.User{}, false
}

func (r *InMemoryUserRepo) List() []model.User {
	r.mu.RLock()
	defer r.mu.RUnlock()
	list := make([]model.User, 0, len(r.users))
	for _, u := range r.users {
		list = append(list, u)
	}
	return list
}

func (r *InMemoryUserRepo) Update(id int, user model.User) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	_, ok := r.users[id]
	if !ok {
		return false
	}
	r.users[id] = user
	return true
}

func (r *InMemoryUserRepo) Delete(id int) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	_, ok := r.users[id]
	if !ok {
		return false
	}
	delete(r.users, id)
	return true
}

func (r *InMemoryUserRepo) NextID() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	id := r.next
	r.next++
	return id
}
