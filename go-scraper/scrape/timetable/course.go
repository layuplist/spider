package timetable

import (
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"../shared"
)

type xlist struct {
	Dept string  `json:"dept"`
	Num  float64 `json:"num"`
}

type course struct {
	Building    string   `json:"building"`
	CRN         int      `json:"crn"`
	DeptLink    string   `json:"department_url"`
	Dist        []string `json:"dist"`
	Enrl        int      `json:"current_enrollment"`
	FYS         bool     `json:"first_year_seminar"`
	Instructors []string `json:"instructors"`
	Lim         int      `json:"max_enrollment"`
	LrnObj      string   `json:"learning_objective_url"`
	Num         float64  `json:"num"`
	Period      string   `json:"period"`
	Room        string   `json:"room"`
	Sec         int      `json:"sec"`
	Status      string   `json:"status"`
	Subj        string   `json:"subj"`
	Term        int      `json:"term"`
	Text        string   `json:"text"`
	Title       string   `json:"title"`
	URL         string   `json:"catalog_url"`
	WC          string   `json:"wc"`
	Xlist       []xlist  `json:"xlist"`
}

func newCourse(s *goquery.Selection) *course {
	c := new(course)

	c.Building = getBuilding(s)
	c.CRN = getCRN(s)
	c.DeptLink = getDeptLink(s)
	c.Dist = getDist(s)
	c.Enrl = getEnrl(s)
	c.FYS = getFYS(s)
	c.Instructors = getInstructors(s)
	c.Lim = getLim(s)
	c.LrnObj = getLrnObj(s)
	c.Num = getNum(s)
	c.Period = getPeriod(s)
	c.Room = getRoom(s)
	c.Sec = getSec(s)
	c.Status = getStatus(s)
	c.Subj = getSubj(s)
	c.Term = getTerm(s)
	c.Text = getText(s)
	c.Title = getTitle(s)
	c.URL = getURL(s)
	c.WC = getWC(s)
	c.Xlist = getXlist(s)

	return c
}

func getBuilding(s *goquery.Selection) string {
	el := s.Find("td:nth-child(13)").Text()
	el = strings.TrimSpace(el)

	return el
}

func getCRN(s *goquery.Selection) int {
	el := s.Find("td:nth-child(2)").Text()

	num, _ := strconv.Atoi(el)

	return num
}

func getDeptLink(s *goquery.Selection) string {
	el, _ := s.Find("td:nth-child(3) > a").Attr("href")
	el = strings.TrimSpace(el)

	return el
}

func getDist(s *goquery.Selection) []string {
	el := s.Find("td:nth-child(16)").Text()
	el = strings.TrimSpace(el)

	els := strings.Split(el, "or")

	for i := range els {
		els[i] = strings.TrimSpace(els[i])
	}

	if els[0] == "" {
		return nil
	}
	return els
}

func getEnrl(s *goquery.Selection) int {
	el := s.Find("td:nth-child(18)").Text()

	num, _ := strconv.Atoi(el)

	return num
}

func getFYS(s *goquery.Selection) bool {
	el := s.Find("td:nth-child(6)").Text()

	if el == "Y" {
		return true
	}
	return false
}

func getInstructors(s *goquery.Selection) []string {
	el := s.Find("td:nth-child(14)").Text()

	els := strings.Split(el, ",")

	for i := range els {
		els[i] = strings.TrimSpace(els[i])
	}

	return els
}

func getLim(s *goquery.Selection) int {
	el := s.Find("td:nth-child(17)").Text()

	num, _ := strconv.Atoi(el)

	return num
}

func getLrnObj(s *goquery.Selection) string {
	el, _ := s.Find("td:nth-child(20) > a").Attr("href")
	el = strings.Trim(el, `javascript:reqmat_window('')`)

	return el
}

func getNum(s *goquery.Selection) float64 {
	el := s.Find("td:nth-child(4)").Text()
	el = strings.TrimSpace(el)

	num := shared.Num(el)

	return num
}

func getPeriod(s *goquery.Selection) string {
	el := s.Find("td:nth-child(11)").Text()
	el = strings.TrimSpace(el)

	return el
}

func getRoom(s *goquery.Selection) string {
	el := s.Find("td:nth-child(12)").Text()
	el = strings.TrimSpace(el)

	return el
}

func getSec(s *goquery.Selection) int {
	el := s.Find("td:nth-child(5)").Text()

	num, _ := strconv.Atoi(el)

	return num
}

func getStatus(s *goquery.Selection) string {
	el := s.Find("td:nth-child(19)").Text()
	el = strings.TrimSpace(el)

	return el
}

func getSubj(s *goquery.Selection) string {
	el := s.Find("td:nth-child(3) > a").Text()
	el = strings.TrimSpace(el)

	return el
}

func getTerm(s *goquery.Selection) int {
	el := s.Find("td:nth-child(1)").Text()

	num, _ := strconv.Atoi(el)

	return num
}

func getText(s *goquery.Selection) string {
	el, _ := s.Find("td:nth-child(9) > a").Attr("href")
	el = strings.Trim(el, `javascript:reqmat_window('')`)

	return el
}

func getTitle(s *goquery.Selection) string {
	el := s.Find("td:nth-child(8) > a").Text()

	return el
}

func getURL(s *goquery.Selection) string {
	el, _ := s.Find("td:nth-child(8) > a").Attr("href")
	el = strings.Trim(el, `javascript:reqmat_window('')`)

	return el
}

func getWC(s *goquery.Selection) string {
	el := s.Find("td:nth-child(15)").Text()
	el = strings.TrimSpace(el)

	return el
}

func getXlist(s *goquery.Selection) []xlist {
	el := s.Find("td:nth-child(10)").Text()

	if len(el) < 5 {
		return nil
	}

	els := strings.Split(el, ",")

	var e []xlist

	for i := range els {
		dept := shared.XlistDept(els[i])
		num := shared.Num(els[i])

		e = append(e, xlist{dept, num})
	}

	return e
}
