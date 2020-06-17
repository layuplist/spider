import axios from 'axios';
import cheerio from 'cheerio';
import XXHash from 'xxhash';

// * config

const rootURL = 'http://dartmouth.smartcatalogiq.com';
const orcURL = `${rootURL}/en/current/orc`;

const orcSchoolURL = (graduate) => {
  return (
    `${orcURL}/Departments-Programs-${graduate ? 'Graduate' : 'Undergraduate'}`
  );
};

const orcSupplementURL = (year) => {
  if (year < 2018) {
    return (
      `${rootURL}/en/${year}s/Supplement/Courses`
    );
  } else {
    return (
      `${rootURL}/${year}s/Supplement/New-Undergraduate-Courses`
    );
  }
};

const orcChildrenURL = (path) => {
  return (
    `${path}?getchildren=1`
  );
};

const courseRegex = /^[A-Z]+\s[0-9]+(.[0-9]+)?$/;

// * full scrape (all courses, all departments)

// * fetch

const childrenFetch = (url = orcChildrenURL(orcSchoolURL(false))) => {
  console.log(`fetching ${url}`);
  return axios.get(url)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      if (err.response.status === 404) {
        return null;
      } else {
        return err;
      }
    });
};

const departmentFetch = () => {
  // TODO
};

const courseFetch = () => {
  // TODO
};

// * scrape

const childrenScrape = (source) => {
  const data = cheerio.load(source);
  const childrenEl = data('ul[class=navLocal] > li');

  const children = [];
  childrenEl.each((childIndex, childEl) => {
    const aTag = data(childEl).find('a').first();
    const courseMatch = aTag.text().trim().match(courseRegex);

    children[childIndex] = {
      text: aTag.text(),
      url: aTag.attr('href'),
      hasChildren: data(childEl).hasClass('hasChildren'),
      isCourse: Boolean(courseMatch),
    };

    console.log(children[childIndex]);
  });

  return children;
};

async function fullCourseURLScrape(source, courses = []) {
  const children = childrenScrape(source);
  const promises = [];

  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];

    if (child.hasChildren) {
      promises.push(new Promise((resolve, reject) => {
        childrenFetch(orcChildrenURL(`${rootURL}${child.url}`))
          .then((newSource) => {
            fullCourseURLScrape(newSource, courses)
              .then((newCourses) => {
                courses.concat(newCourses);

                resolve();
              })
              .catch((_err) => {
                reject();
              });
          })
          .catch((_err) => {
            reject();
          });
      }));
    }

    if (child.isCourse) {
      const [subj, num] = child.text.split(' ');

      courses.push({
        subj,
        num,
        url: child.url,
      });
    }
  }

  await Promise.all(promises);

  return courses.map((course) => {
    return {
      ...course,
      url: `${rootURL}${course.url}`,
    };
  });
}

const fullCourseScrape = (source) => {
  // TODO
};

// * supplement scrape (new courses only)

// * fetch

const supplementURLFetch = (year) => {
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

const supplementURLScrape = (source) => {
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
  childrenFetch,
  fullCourseURLScrape,
  supplementURLFetch,
  supplementURLScrape,
};
