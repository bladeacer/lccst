package tests

import (
	"encoding/json"
	"testing"

	"go-login-crud-skill/internal/model"
	"go-login-crud-skill/internal/repository"
)

func newTestRepo() *repository.InMemoryUserRepository {
	return repository.NewInMemoryUserRepository()
}

func TestRepositoryCreate(t *testing.T) {
	repo := newTestRepo()
	user, err := repo.Create(model.CreateUserRequest{Username: "alice", Password: "secret"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.Username != "alice" {
		t.Errorf("expected alice, got %s", user.Username)
	}
	if user.ID == "" {
		t.Error("expected non-empty id")
	}
	data, err := json.Marshal(user)
	if err != nil {
		t.Fatalf("json marshal error: %v", err)
	}
	var result map[string]interface{}
	json.Unmarshal(data, &result)
	if _, exists := result["password"]; exists {
		t.Error("password should not be exposed in json")
	}
}

func TestRepositoryGetByID(t *testing.T) {
	repo := newTestRepo()
	created, _ := repo.Create(model.CreateUserRequest{Username: "alice", Password: "secret"})
	got, err := repo.GetByID(created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Username != "alice" {
		t.Errorf("expected alice, got %s", got.Username)
	}
}

func TestRepositoryGetByIDNotFound(t *testing.T) {
	repo := newTestRepo()
	_, err := repo.GetByID("nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent user")
	}
}

func TestRepositoryGetAll(t *testing.T) {
	repo := newTestRepo()
	repo.Create(model.CreateUserRequest{Username: "alice", Password: "pass"})
	repo.Create(model.CreateUserRequest{Username: "bob", Password: "pass"})
	users, err := repo.GetAll()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(users) != 2 {
		t.Errorf("expected 2 users, got %d", len(users))
	}
}

func TestRepositoryUpdate(t *testing.T) {
	repo := newTestRepo()
	created, _ := repo.Create(model.CreateUserRequest{Username: "alice", Password: "secret"})
	updated, err := repo.Update(created.ID, model.UpdateUserRequest{Username: "alice-updated", Password: "newpass"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.Username != "alice-updated" {
		t.Errorf("expected alice-updated, got %s", updated.Username)
	}
}

func TestRepositoryUpdateNotFound(t *testing.T) {
	repo := newTestRepo()
	_, err := repo.Update("nonexistent", model.UpdateUserRequest{Username: "x", Password: "x"})
	if err == nil {
		t.Error("expected error for nonexistent user")
	}
}

func TestRepositoryDelete(t *testing.T) {
	repo := newTestRepo()
	created, _ := repo.Create(model.CreateUserRequest{Username: "alice", Password: "secret"})
	err := repo.Delete(created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	_, err = repo.GetByID(created.ID)
	if err == nil {
		t.Error("expected error after delete")
	}
}

func TestRepositoryDeleteNotFound(t *testing.T) {
	repo := newTestRepo()
	err := repo.Delete("nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent user")
	}
}
