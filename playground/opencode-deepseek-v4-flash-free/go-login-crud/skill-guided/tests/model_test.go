package tests

import (
	"testing"

	"go-login-crud-skill/internal/model"
)

func TestUserModel(t *testing.T) {
	u := model.User{ID: "1", Username: "alice", Password: "hashed"}
	if u.ID != "1" {
		t.Errorf("expected id 1, got %s", u.ID)
	}
	if u.Username != "alice" {
		t.Errorf("expected username alice, got %s", u.Username)
	}
}

func TestCreateUserRequest(t *testing.T) {
	tests := []struct {
		name     string
		req      model.CreateUserRequest
		wantErr  bool
		errMsg   string
	}{
		{"valid", model.CreateUserRequest{Username: "alice", Password: "secret"}, false, ""},
		{"missing username", model.CreateUserRequest{Username: "", Password: "secret"}, true, "username is required"},
		{"missing password", model.CreateUserRequest{Username: "alice", Password: ""}, true, "password is required"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if tt.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				} else if err.Error() != tt.errMsg {
					t.Errorf("expected %q, got %q", tt.errMsg, err.Error())
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestUpdateUserRequest(t *testing.T) {
	tests := []struct {
		name     string
		req      model.UpdateUserRequest
		wantErr  bool
		errMsg   string
	}{
		{"valid", model.UpdateUserRequest{Username: "bob", Password: "newpass"}, false, ""},
		{"missing username", model.UpdateUserRequest{Username: "", Password: "pass"}, true, "username is required"},
		{"missing password", model.UpdateUserRequest{Username: "bob", Password: ""}, true, "password is required"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if tt.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				} else if err.Error() != tt.errMsg {
					t.Errorf("expected %q, got %q", tt.errMsg, err.Error())
				}
			} else if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestErrorResponse(t *testing.T) {
	err := (&model.CreateUserRequest{Username: "", Password: ""}).Validate()
	if err == nil {
		t.Fatal("expected error")
	}
	if err.Error() != "username is required" {
		t.Errorf("expected username is required, got %s", err.Error())
	}
}
