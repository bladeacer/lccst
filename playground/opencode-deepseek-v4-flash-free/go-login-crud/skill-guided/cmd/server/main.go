package main

import "log"

func main() {
	app := NewApp()
	log.Printf("Server starting on %s", app.Server.Addr)
	log.Fatal(app.Server.ListenAndServe())
}
