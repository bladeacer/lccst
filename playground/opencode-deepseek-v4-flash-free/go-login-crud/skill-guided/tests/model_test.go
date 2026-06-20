package tests

import (
	"testing"
	"go-login-crud-skill/internal/model"
)

func TestUserModel(t *testing.T) {
	u := model.User{ID: 1, Name: "Alice", Email: "alice@test.com"}
	if u.Name != "Alice" {
		t.Errorf("expected Alice, got %s", u.Name)
	}
}

func TestCreateUserRequest(t *testing.T) {
	req := model.CreateUserRequest{Name: "Bob", Email: "bob@test.com"}
	if req.Email != "bob@test.com" {
		t.Errorf("expected bob@test.com, got %s", req.Email)
	}
}

func TestUpdateUserRequest(t *testing.T) {
	name := "Bob Updated"
	req := model.UpdateUserRequest{Name: &name}
	if *req.Name != "Bob Updated" {
		t.Errorf("expected Bob Updated, got %s", *req.Name)
	}
}

func TestErrorResponse(t *testing.T) {
	err := model.ErrorResponse{Error: "Not found"}
	if err.Error != "Not found" {
		t.Errorf("expected 'Not found', got %s", err.Error)
	}
}
