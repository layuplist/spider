package layuplist

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"../spider"
)

// Offering represents a single offering (i.e. course) of a department's offerings
type Offering struct {
	Layuplist string   `json:"layup_url"`
	ID        int      `json:"layup_id"`
	Title     string   `json:"title"`
	Dept      string   `json:"department"`
	Offered   bool     `json:"offered"`
	Distribs  []string `json:"distribs"`
	Reviews   int      `json:"total_reviews"`
	Quality   int      `json:"quality_score"`
	Layup     int      `json:"layup_score"`
}

func newOffering(s *goquery.Selection, d string) *Offering {
	o := new(Offering)

	o.ID = getID(s)
	o.Layuplist = getURL(o.ID)
	o.Title = getTitle(s)
	o.Dept = d
	o.Offered = isOffered(s)
	o.Distribs = getDistribs(s)
	o.Reviews = getNum(s, 4)
	o.Quality = getNum(s, 5)
	o.Layup = getNum(s, 6)

	return o
}

func getURL(i int) string {
	s := strconv.Itoa(i)
	url := fmt.Sprintf("%s/%s", "https://www.layuplist.com/course", s)

	return url
}

func getID(s *goquery.Selection) int {
	el, _ := s.Attr("onclick")

	pattern, _ := regexp.Compile("window.document.location='/course/(.*)'")

	submatches := pattern.FindStringSubmatch(el)

	id, _ := strconv.Atoi(submatches[1])

	return id
}

func getTitle(s *goquery.Selection) string {
	el := s.Find("td:nth-child(1)").Text()

	return strings.TrimSpace(el)
}

func isOffered(s *goquery.Selection) bool {
	el := s.Find("td:nth-child(2)").Text()

	return strings.Contains(el, "Offered")
}

func getDistribs(s *goquery.Selection) []string {
	el := s.Find("td:nth-child(3)").Text()
	el = strings.TrimSpace(el)

	els := strings.Split(el, ",")

	for i := range els {
		els[i] = strings.TrimSpace(els[i])
	}

	if els[0] == "" {
		return nil
	}
	return els
}

func getNum(s *goquery.Selection, i int) int {
	selector := fmt.Sprintf("td:nth-child(%d)", i)

	el := s.Find(selector).Text()
	el = strings.TrimSpace(el)

	num, _ := strconv.Atoi(el)

	return num
}

// Offerings is a struct for a department's course offerings
type Offerings struct {
	url       string
	cookie    string
	dept      string
	Offerings []*Offering `json:"courses"`
	Updated   string      `json:"updated"`
	Total     int         `json:"total"`
}

// NewOfferings returns a new Offerings struct populated with a department's offerings
func NewOfferings(department string, url string, cookie string) *Offerings {
	o := new(Offerings)

	o.url = fmt.Sprintf("%s/%s%s", url, "/search?q=", department)
	o.cookie = cookie
	o.dept = department
	o.Offerings = o.getAsyncOfferings()
	o.Total = len(o.Offerings)

	current := time.Now()

	o.Updated = current.Format("2006-01-02 15:04:05")

	return o
}

func (o Offerings) getAsyncOfferings() []*Offering {
	s := o.fetchOfferings()

	els := s.Find("tbody > tr")

	total := els.Size()

	var res []*Offering

	ochan := make(chan *Offering, total)

	o.getOfferings(ochan, els, total)

	close(ochan)

	for i := range ochan {
		res = append(res, i)
	}

	return res
}

func (o Offerings) getOfferings(offerings chan *Offering, rows *goquery.Selection, total int) {
	var wg sync.WaitGroup

	wg.Add(total)

	rows.Each(func(i int, s *goquery.Selection) {
		go func(offerings chan *Offering) {
			defer wg.Done()
			offerings <- newOffering(s, o.dept)

		}(offerings)
	})

	wg.Wait()

}

func (o Offerings) fetchOfferings() *spider.Spider {
	s := spider.New(o.url, o.cookie, nil)

	return s
}
