package scrape

import (
	"os"
	"strings"

	"./layuplist"
	"./shared"
	timetable "./timetable"
	log "github.com/sirupsen/logrus"
)

// Init starts the scraping process
func Init(layupURL string, layupCookie string, orcURL string) {
	switch {
	case layupURL == "":
		log.Fatal("$LAYUP_URL must be set")
	case layupCookie == "":
		log.Fatal("$LAYUP_COOKIE must be set")
	case orcURL == "":
		log.Fatal("$ORC_URL must be set")
	}

	dir, _ := os.Getwd()

	d := layuplist.NewDepartments(layupURL, layupCookie)

	shared.WriteJSON("data", "departments", d)

	log.WithFields(log.Fields{
		"total_department": d.Total,
		"path":              dir,
		"filename":          "departments.json",
	}).Info("Scraped departments")

	var c []*layuplist.Course

	for i := range d.Departments {
		department := d.Departments[i].Code
		log.WithFields(log.Fields{"department": department, "LayupURL": layupURL, "layupCookie": layupCookie}).Info("New Offering")
		o := layuplist.NewOfferings(department, layupURL, layupCookie)

		shared.WriteJSON("data/courses", strings.ToLower(department), o)

		courses := layuplist.NewCourses(o, layupURL, layupCookie)

		c = append(c, courses.Courses...)
	}

	shared.WriteJSON("data", "courses", c)

	log.WithFields(log.Fields{
		"path": dir,
	}).Info("Scraped all Layup List data for all courses")

	t := timetable.NewTimeable(orcURL)

	shared.WriteJSON("data", "timetable", t)

	log.WithFields(log.Fields{
		"path":     dir,
		"filename": "timetable.json",
		"total":    t.Total,
	}).Info("Scraped timetable")
}
