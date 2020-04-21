package layuplist

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"../shared"
	"../spider"

	log "github.com/sirupsen/logrus"
)

type courses struct {
	Median       string  `json:"median"`
	Section      int     `json:"section"`
	NumericValue float64 `json:"numeric_value"`
	Enrollment   int     `json:"enrollment"`
}

// Medians is a struct for the Layup List medians endpoint
type Medians struct {
	Term            string    `json:"term"`
	Courses         []courses `json:"courses"`
	AvgNumericValue float64   `json:"avg_numeric_value"`
}

// Professors is a struct for the Layup List professors endpoint
type Professors []string

// Course is a struct for a course's page on Layup List
type Course struct {
	*Offering
	Xlist      []int      `json:"xlist"`
	Name       string     `json:"name"`
	Number     float64    `json:"number"`
	Periods    []string   `json:"periods"`
	Desc       string     `json:"description"`
	Reviews    []string   `json:"reviews"`
	Similar    []int      `json:"similar_courses"`
	Orc        string     `json:"orc_url"`
	Medians    []Medians  `json:"medians"`
	Terms      []string   `json:"terms_offered"`
	Professors Professors `json:"professors"`
}

func newCourse(o *Offering, cookie string) *Course {
	c := new(Course)

	c.Offering = o

	c.Name = getName(c.Title)

	name := shared.StripTitle(c.Title)

	cpage := fetch(o.Layuplist, cookie)

	c.Number = shared.Num(name)
	c.Xlist = getXlist(cpage)
	c.Periods = getPeriods(cpage)
	c.Desc = getDescription(cpage)
	c.Similar = getSimilar(cpage)
	c.Orc = getOrc(cpage)
	c.Medians = getMedians("https://www.layuplist.com/api/course/" + strconv.Itoa(o.ID) + "/medians")
	c.Terms = getTerms(c.Medians)
	c.Professors = getProfessors("https://www.layuplist.com/api/course/" + strconv.Itoa(o.ID) + "/professors")

	rpage := fetch(o.Layuplist+"/review_search", cookie)

	c.Reviews = getReviews(rpage)

	log.Info(c.Title)

	return c
}

func getName(s string) string {
	pattern, _ := regexp.Compile(`:(.*)`)

	submatches := pattern.FindStringSubmatch(s)

	name := submatches[1]

	return strings.TrimSpace(name)
}

func getXlist(s *spider.Spider) []int {
	ids := make([]int, 0)

	els := s.Find("p")
	els = shared.XlistNode(els)

	if els == nil {
		return nil
	}

	els.Each(func(i int, s *goquery.Selection) {
		el, _ := s.Attr("href")

		id := shared.XlistID(el)

		if id != -1 {
			ids = append(ids, id)
		}
	})

	return ids
}

func getSimilar(s *spider.Spider) []int {
	ids := make([]int, 0)

	els := s.Find("tr")

	els.Each(func(i int, s *goquery.Selection) {
		el, _ := s.Attr("onclick")

		id := shared.SimilarID(el)

		if id != -1 {
			ids = append(ids, id)
		}
	})

	if len(ids) == 0 {
		return nil
	}

	return ids
}

func getOrc(s *spider.Spider) string {
	str := ""

	s.Find("a").Each(func(i int, s *goquery.Selection) {
		el, _ := s.Attr("href")
		if strings.Contains(el, "http://dartmouth.smartcatalogiq.com/en/current/orc/") {
			str = el
		}
	})

	return str
}

func getReviews(s *spider.Spider) []string {
	els := s.Find("tr")

	reviews := make([]string, els.Size())

	els.Each(func(i int, s *goquery.Selection) {
		re := regexp.MustCompile(`\s+`)
		review := re.ReplaceAllString(s.Find("td").Text(), " ")

		reviews[i] = strings.TrimSpace(review)
	})

	if len(reviews) == 0 {
		return nil
	}

	return reviews
}

func getDescription(s *spider.Spider) string {
	el := s.Find("div:nth-child(1) > div > p:nth-child(3)").Text()

	if !strings.Contains(el, "ORC") && !strings.Contains(el, "Crosslisted") {
		return strings.TrimSpace(el)
	}

	return ""
}

func getPeriods(s *spider.Spider) []string {
	el := s.Find("div:nth-child(1) > div > h4").Text()

	pattern, _ := regexp.Compile(`\(([^\)]+)\)`)

	submatches := pattern.FindStringSubmatch(el)

	if submatches != nil && len(submatches) >= 1 {
		el := strings.TrimSpace(submatches[1])
		els := strings.Split(el, ",")

		for i := range els {
			els[i] = strings.TrimSpace(els[i])
		}

		return els
	}

	return nil
}

func getMedians(url string) []Medians {
	res, err := http.Get(url)
	if err != nil {
		log.Fatal(err)
	}
	defer res.Body.Close()

	var c Course

	json.NewDecoder(res.Body).Decode(&c)

	if len(c.Medians) > 0 {
		return c.Medians
	}

	return nil
}

func getProfessors(url string) Professors {
	res, err := http.Get(url)
	if err != nil {
		log.Fatal(err)
	}
	defer res.Body.Close()

	var c Course

	json.NewDecoder(res.Body).Decode(&c)

	if len(c.Professors) > 0 {
		return c.Professors
	}

	return nil
}

func getTerms(m []Medians) []string {
	n := len(m)

	if n <= 0 {
		return nil
	}

	terms := make([]string, n)

	for i := range m {
		terms[i] = m[i].Term
	}

	return terms
}

func fetch(url string, cookie string) *spider.Spider {
	s := spider.New(url, cookie, nil)

	return s
}

// Courses is a container for courses
type Courses struct {
	url     string
	cookie  string
	Courses []*Course `json:"courses"`
	Total   int       `json:"total"`
	Updated string    `json:"updated"`
}

// NewCourses returns a new Courses struct, populated with courses
func NewCourses(o *Offerings, url string, cookie string) *Courses {
	c := new(Courses)

	c.url = url
	c.cookie = cookie
	c.Courses = o.getAsyncCourses()
	c.Total = len(c.Courses)

	current := time.Now()

	c.Updated = current.Format("2006-01-02 15:04:05")

	return c
}

func (o Offerings) getAsyncCourses() []*Course {
	var c []*Course

	cchan := make(chan *Course, o.Total)

	o.getCourses(cchan, o.Offerings, o.Total)

	close(cchan)

	for i := range cchan {
		c = append(c, i)
	}

	return c
}

func (o Offerings) getCourses(courses chan *Course, offerings []*Offering, total int) {
	var wg sync.WaitGroup

	wg.Add(total)

	for i := range offerings {
		offering := offerings[i]

		go func(courses chan *Course) {
			defer wg.Done()
			courses <- newCourse(offering, o.cookie)

		}(courses)
	}

	wg.Wait()
}
