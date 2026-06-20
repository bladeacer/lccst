package tests

import (
	"testing"

	"skill-guided-login-crud/internal/model"
	"skill-guided-login-crud/internal/repository"
)

func TestCreateAndFindUser(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	user := repo.Create(model.User{Username: "Alice", Password: "secret", Email: "alice@test.com"})
	if user.ID != 1 {
		t.Fatalf("expected ID 1, got %d", user.ID)
	}
	if user.Password == "secret" {
		t.Fatal("password should be hashed")
	}
	found := repo.FindByUsername("Alice")
	if found == nil {
		t.Fatal("expected to find Alice")
	}
}

func TestFindByID(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	u1 := repo.Create(model.User{Username: "u1", Password: "p1", Email: "u1@test.com"})
	found := repo.FindByID(u1.ID)
	if found == nil {
		t.Fatal("expected to find user by ID")
	}
	if repo.FindByID(999) != nil {
		t.Fatal("expected nil for non-existent ID")
	}
}

func TestRepoListUsers(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	repo.Create(model.User{Username: "a", Password: "p", Email: "a@t.com"})
	repo.Create(model.User{Username: "b", Password: "p", Email: "b@t.com"})
	users := repo.List()
	if len(users) != 2 {
		t.Fatalf("expected 2 users, got %d", len(users))
	}
}

func TestRepoUpdateUser(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	u := repo.Create(model.User{Username: "u", Password: "p", Email: "old@t.com"})
	updated, err := repo.Update(u.ID, "new@t.com")
	if err != nil {
		t.Fatal(err)
	}
	if updated.Email != "new@t.com" {
		t.Fatalf("expected new@t.com, got %s", updated.Email)
	}
	_, err = repo.Update(999, "x@t.com")
	if err == nil {
		t.Fatal("expected error for non-existent ID")
	}
}

func TestRepoDeleteUser(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	u := repo.Create(model.User{Username: "u", Password: "p", Email: "u@t.com"})
	if err := repo.Delete(u.ID); err != nil {
		t.Fatal(err)
	}
	if repo.FindByID(u.ID) != nil {
		t.Fatal("user should be deleted")
	}
	if err := repo.Delete(999); err == nil {
		t.Fatal("expected error deleting non-existent user")
	}
}
