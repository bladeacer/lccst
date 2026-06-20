package tests

import (
	"encoding/json"
	"testing"

	"go-login-crud/internal/repository"
)

func TestCreateAndGet(t *testing.T) {
	repo := repository.NewInMemory()
	user, err := repo.Create("alice", "secret")
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if user.Username != "alice" {
		t.Errorf("expected username alice, got %s", user.Username)
	}
	if user.ID == "" {
		t.Error("expected non-empty ID")
	}

	got, ok := repo.Get(user.ID)
	if !ok {
		t.Fatal("Get returned not found")
	}
	if got.Username != "alice" {
		t.Errorf("expected username alice, got %s", got.Username)
	}
}

func TestCreateDuplicate(t *testing.T) {
	repo := repository.NewInMemory()
	_, err := repo.Create("bob", "pass")
	if err != nil {
		t.Fatalf("first Create failed: %v", err)
	}
	_, err = repo.Create("bob", "pass2")
	if err == nil {
		t.Fatal("expected error for duplicate username")
	}
}

func TestGetNotFound(t *testing.T) {
	repo := repository.NewInMemory()
	_, ok := repo.Get("nonexistent")
	if ok {
		t.Fatal("expected false for nonexistent user")
	}
}

func TestUpdate(t *testing.T) {
	repo := repository.NewInMemory()
	user, _ := repo.Create("carol", "pass1")

	updated, err := repo.Update(user.ID, "carol_new", "pass2")
	if err != nil {
		t.Fatalf("Update failed: %v", err)
	}
	if updated.Username != "carol_new" {
		t.Errorf("expected username carol_new, got %s", updated.Username)
	}

	_, loginOK := repo.Login("carol_new", "pass2")
	if !loginOK {
		t.Error("expected login to succeed with new password")
	}
}

func TestDelete(t *testing.T) {
	repo := repository.NewInMemory()
	user, _ := repo.Create("dave", "pass")

	err := repo.Delete(user.ID)
	if err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	_, ok := repo.Get(user.ID)
	if ok {
		t.Fatal("expected user to be deleted")
	}
}

func TestLogin(t *testing.T) {
	repo := repository.NewInMemory()
	repo.Create("eve", "mypassword")

	_, ok := repo.Login("eve", "mypassword")
	if !ok {
		t.Fatal("expected successful login")
	}

	_, ok = repo.Login("eve", "wrongpassword")
	if ok {
		t.Fatal("expected failed login with wrong password")
	}

	_, ok = repo.Login("nonexistent", "pass")
	if ok {
		t.Fatal("expected failed login for nonexistent user")
	}
}

func TestPasswordNotLeakedInJSON(t *testing.T) {
	repo := repository.NewInMemory()
	user, _ := repo.Create("frank", "supersecret")

	data, err := json.Marshal(user)
	if err != nil {
		t.Fatalf("Marshal failed: %v", err)
	}

	var result map[string]any
	json.Unmarshal(data, &result)
	if _, ok := result["password"]; ok {
		t.Error("password key should not appear in JSON output")
	}
}
