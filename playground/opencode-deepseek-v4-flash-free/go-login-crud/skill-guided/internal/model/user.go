package model

import "crypto/sha256"
import "encoding/hex"

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"-"`
}

func NewUser(id int, username, password string) User {
	h := sha256.Sum256([]byte(password))
	return User{
		ID:       id,
		Username: username,
		Password: hex.EncodeToString(h[:]),
	}
}

func HashPassword(password string) string {
	h := sha256.Sum256([]byte(password))
	return hex.EncodeToString(h[:])
}
