import axios from 'axios';
import cheerio from 'cheerio';
import XXHash from 'xxhash';
import qs from 'querystring';

// * config

const rootURL = 'http://dartmouth.smartcatalogiq.com/en/current/orc';
const orcURL = `${rootURL}/en/current/orc`;

const orcSchoolURL = (graduate) => {
  if (year < 2018) {
    return (
      `${orcURL}/Departments-Programs-${graduate ? 'Graduate' : 'Undergraduate'}`
    );
  } else {
    return (
      `${orcURL}/${year}s/Supplement/New-Undergraduate-Courses`
    );
  }
};

const orcSupplementURL = (year) => {
  return (
    `${rootURL}/en/${year}s/Supplement/Courses`
  );
};

// * full scrape (all courses, all departments)

// * fetch

const fetchDepartment = () => {
  // TODO
};

// * scrape

const fullScrape = () => {
  // TODO
};

// * supplement scrape (new courses only)

// * fetch

const supplementFetch = (year) => {
  return axios.post(orcSupplementURL(year))
    .then((res) => {
      // generate hash
      const hash = XXHash.hash64(Buffer.from(res.data), Buffer.from('D-PLANNER'), 'hex');

      // return hash * data
      return {
        hash,
        data: res.data,
      };
    })
    .catch((err) => {
      const errMsg = `Error fetching supplemental courses: ${err}`;

      // log error
      console.log(errMsg);

      // return error message
      return {
        msg: errMsg,
      };
    });
};

// * scrape

const supplementScrape = (source) => {
  // create cheerio object and filter out relevant elements
  const data = cheerio.load(source);
  const listings = data('div[id=middle] > div[id=rightpanel] > div[id=main] > ul > li');

  // get courses
  const courses = [];
  listings.each((listingIndex, listingEl) => {
    const info = data(listingEl).find('a').first().text()
      .split('&nbsp;');

    const [courseSubj, courseNum] = info;
    const courseURL = data(listingEl).find('a').first().attr('href');

    courses[listingIndex] = {
      subj: courseSubj,
      num: courseNum,
      url: courseURL,
    };
  });

  // return course data
  return courses;
};

// * export

export {
  supplementFetch,
  supplementScrape,
};
