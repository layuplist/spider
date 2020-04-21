package server

import (
	"fmt"
	"strings"

	"../scrape"
	"github.com/gin-gonic/gin"
)

func setupRouter(layupURL string, layupCookie string, orcURL string) *gin.Engine {
	r := gin.Default()

	r.Use(gin.Logger())
	r.Use(preflight())

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"home": "🏠",
		})
	})

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"pong": "🏓",
		})
	})

	r.GET("/scrape", func(c *gin.Context) {
		scrape.Init(layupURL, layupCookie, orcURL)

		c.JSON(200, gin.H{
			"message": "😅... finished!",
		})
	})

	r.GET("/courses", func(c *gin.Context) {
		c.File("data/courses.json")
	})

	r.GET("/timetable", func(c *gin.Context) {
		c.File("data/timetable.json")
	})

	r.GET("/departments", func(c *gin.Context) {
		c.File("data/departments.json")
	})

	r.GET("/courses/:dept", func(c *gin.Context) {
		dept := c.Param("dept")
		dept = strings.ToLower(dept)

		path := fmt.Sprintf("data/courses/%s.json", dept)

		c.File(path)
	})

	return r
}

func preflight() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Headers", "access-control-allow-origin, access-control-allow-headers")
	}
}
