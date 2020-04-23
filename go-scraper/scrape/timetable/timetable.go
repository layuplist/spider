package timetable

import (
	"net/url"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"../spider"

	log "github.com/sirupsen/logrus"
)

var payload = url.Values{
	"distribradio": {"alldistribs"},
	"depts":        {"no_value"},
	"periods":      {"no_value"},
	"distribs":     {"no_value"},
	"distribs_i":   {"no_value"},
	"distribs_wc":  {"no_value"},
	"pmode":        {"public"},
	"term":         {""},
	"levl":         {""},
	"fys":          {"n"},
	"wrt":          {"n"},
	"pe":           {"n"},
	"review":       {"n"},
	"crnl":         {"no_value"},
	"classyear":    {"2008"},
	"termradio":    {"allterms"},
	"terms":        {"no_value"},
	"subjectradio": {"allsubjects"},
	"hoursradio":   {"allhours"},
	"sortorder":    {"dept"},
	"searchtype":   {"Subject Area(s)"},
}

// Timetable is a struct for the ORC timetable
type Timetable struct {
	url     string
	payload url.Values
	Courses []*course `json:"courses"`
	Total   int       `json:"total"`
	Updated string    `json:"updated"`
}

// NewTimeable returns a new Timetable
func NewTimeable(url string) *Timetable {
	t := new(Timetable)

	t.url = url
	t.payload = payload
	t.Courses = t.getAsyncCourses()
	t.Total = len(t.Courses)

	current := time.Now()

	t.Updated = current.Format("2006-01-02 15:04:05")

	log.WithFields(log.Fields{
		"total": t.Total,
	}).Info("Scraped courses")

	return t
}

func (t Timetable) getAsyncCourses() []*course {
	s := t.fetchTimetable()

	els := s.Find("div.data-table > table > tbody > tr")

	total := els.Size()

	var c []*course

	cchan := make(chan *course, total)

	getCourses(cchan, els, total)

	close(cchan)

	for i := range cchan {
		if i.CRN == 0 {
			continue
		}
		c = append(c, i)
	}

	return c
}

func getCourses(courses chan *course, rows *goquery.Selection, total int) {
	var wg sync.WaitGroup

	wg.Add(total)

	rows.Each(func(i int, s *goquery.Selection) {
		go func(courses chan *course) {
			defer wg.Done()
			courses <- newCourse(s)

		}(courses)
	})

	wg.Wait()
}

func (t Timetable) fetchTimetable() *spider.Spider {
	s := spider.New(t.url, "", t.payload)

	return s
}
