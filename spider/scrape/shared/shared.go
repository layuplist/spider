package shared

import (
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

// WriteJSON writes a JSON file of a given name to a given path
func WriteJSON(path string, name string, i interface{}) {
	filename := fmt.Sprintf("%s/%s.json", path, name)

	file, _ := os.Create(filename)

	json, _ := json.MarshalIndent(i, "", "\t")

	file.Write(json)
}

// SimilarID returns the Layup List ID(s) of similar course(s)
func SimilarID(s string) int {
	pattern, _ := regexp.Compile("'/course/(.*)'")

	submatches := pattern.FindStringSubmatch(s)

	if submatches != nil && !strings.Contains(submatches[1], "/review_search?q=") {
		id, _ := strconv.Atoi(submatches[1])

		return id
	}

	return -1
}

// XlistID returns the Layup List ID(s) for a course's cross-listing(s)
func XlistID(s string) int {
	pattern, _ := regexp.Compile("/course/(.*)")

	submatches := pattern.FindStringSubmatch(s)

	if submatches != nil {
		id, _ := strconv.Atoi(submatches[1])

		return id
	}

	return -1
}

// XlistNode returns the node containing a course's cross-listing(s) if found
// on the course's Layup List page
func XlistNode(s *goquery.Selection) *goquery.Selection {
	var els *goquery.Selection

	s.Each(func(i int, sel *goquery.Selection) {
		if strings.Contains(sel.Text(), strings.TrimSpace("Crosslisted")) {
			els = sel.Find("a")
		}
	})

	return els
}

// StripTitle returns a course's department title from Layup List's department table
// e.g. 'ANTH' from 'ANTH001: Introduction to Anthropology'
func StripTitle(s string) string {
	pattern, _ := regexp.Compile(`^[^:]+\s*`)

	submatches := pattern.FindString(s)

	return submatches
}

// XlistDist returns a cross-listed course's distributive requirements
// as a string array
func XlistDist(s string) []string {
	s = strings.TrimSpace(s)

	els := strings.Split(s, "or")

	return els
}

// XlistDept returns a cross-listed course's department
func XlistDept(s string) string {
	re := regexp.MustCompile(`[a-zA-Z]+`)

	match := re.FindString(s)

	return match
}

// Num returns a course's decimal number
func Num(s string) float64 {
	re := regexp.MustCompile(`[.0-9]+`)

	match := re.FindString(s)

	num, _ := strconv.ParseFloat(match, 64)

	return num
}
