package layuplist

import (
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"../spider"
)

type department struct {
	Code    string `json:"code"`
	Name    string `json:"name"`
	Courses int    `json:"courses"`
}

func newDepartment(s *goquery.Selection) *department {
	d := new(department)

	d.Code = s.Find("td:nth-child(1)").Text()
	d.Name = s.Find("td:nth-child(2)").Text()
	courses := s.Find("td:nth-child(3)").Text()

	d.Courses, _ = strconv.Atoi(courses)

	return d
}

// Departments represents the departments available on Layup List
type Departments struct {
	cookie      string
	url         string
	Departments []*department `json:"departments"`
	Total       int           `json:"total"`
	Updated     string        `json:"updated"`
}

// NewDepartments returns a new Departments struct
func NewDepartments(url string, cookie string) *Departments {
	d := new(Departments)

	d.url = fmt.Sprintf("%s/%s", url, "departments")
	d.cookie = cookie
	d.Departments = d.getAsyncDepartments()
	d.Total = len(d.Departments)

	current := time.Now()

	d.Updated = current.Format("2006-01-02 15:04:05")

	return d
}

func (d Departments) getAsyncDepartments() []*department {
	s := d.fetchDepartments()

	els := s.Find("tbody > tr")

	total := els.Size()

	var res []*department

	dchan := make(chan *department, total)

	getDepartments(dchan, els, total)

	close(dchan)

	for i := range dchan {
		if i.Courses > 1 {
			res = append(res, i)
		}
	}

	return res
}

func getDepartments(departments chan *department, rows *goquery.Selection, total int) {
	var wg sync.WaitGroup

	wg.Add(total)

	rows.Each(func(i int, s *goquery.Selection) {
		go func(departments chan *department) {
			defer wg.Done()
			departments <- newDepartment(s)

		}(departments)
	})

	wg.Wait()
}

func (d Departments) fetchDepartments() *spider.Spider {
	s := spider.New(d.url, d.cookie, nil)

	return s
}
