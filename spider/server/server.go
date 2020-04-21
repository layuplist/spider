package server

import (
	"log"
)

// Init creates a gin router with default middleware:
// logger and recovery (crash-free) middleware
func Init(port string, layupURL string, layupCookie string, orcURL string) {
	if port == "" {
		log.Fatal("$PORT must be set")
	}

	setupRouter(layupURL, layupCookie, orcURL).Run(":" + port)
}
