package tests

import (
	"testing"
	"go-login-crud-skill/internal/repository"
	"go-login-crud-skill/internal/model"
)

func TestRepositoryCreate(t *testing.T) {
	repo := repository.NewUserRepository()
	user := repo.Create(model.CreateUserRequest{Name: "Alice", Email: "alice@test.com"})
	if user.ID != 1 {
		t.Errorf("expected id 1, got %d", user.ID)
	}
}

func TestRepositoryGetByID(t *testing.T) {
	repo := repository.NewUserRepository()
	repo.Create(model.CreateUserRequest{Name: "Alice", Email: "alice@test.com"})
	user, ok := repo.GetByID(1)
	if !ok {
		t.Error("expected ok")
	}
	if user.Name != "Alice" {
		t.Errorf("expected Alice, got %s", user.Name)
	}
}

func TestRepositoryGetByIDNotFound(t *testing.T) {
	repo := repository.NewUserRepository()
	_, ok := repo.GetByID(999)
	if ok {
		t.Error("expected not ok")
	}
}

func TestRepositoryGetAll(t *testing.T) {
	repo := repository.NewUserRepository()
	repo.Create(model.CreateUserRequest{Name: "Alice", Email: "a@t.com"})
	repo.Create(model.CreateUserRequest{Name: "Bob", Email: "b@t.com"})
	users := repo.GetAll()
	if len(users) != 2 {
		t.Errorf("expected 2 users, got %d", len(users))
	}
}

func TestRepositoryUpdate(t *testing.T) {
	repo := repository.NewUserRepository()
	repo.Create(model.CreateUserRequest{Name: "Alice", Email: "a@t.com"})
	name := "Alice Updated"
	user, ok := repo.Update(1, model.UpdateUserRequest{Name: &name})
	if !ok {
		t.Error("expected ok")
	}
	if user.Name != "Alice Updated" {
		t.Errorf("expected Alice Updated, got %s", user.Name)
	}
}

func TestRepositoryUpdateNotFound(t *testing.T) {
	repo := repository.NewUserRepository()
	name := "Ghost"
	_, ok := repo.Update(999, model.UpdateUserRequest{Name: &name})
	if ok {
		t.Error("expected not ok")
	}
}

func TestRepositoryDelete(t *testing.T) {
	repo := repository.NewUserRepository()
	repo.Create(model.CreateUserRequest{Name: "Alice", Email: "a@t.com"})
	ok := repo.Delete(1)
	if !ok {
		t.Error("expected ok")
	}
	if len(repo.GetAll()) != 0 {
		t.Error("expected empty list")
	}
}

func TestRepositoryDeleteNotFound(t *testing.T) {
	repo := repository.NewUserRepository()
	ok := repo.Delete(999)
	if ok {
		t.Error("expected not ok")
	}
}
