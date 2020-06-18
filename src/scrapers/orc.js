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

const genericFetch = (url) => {
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

const childrenFetch = (url = orcSchoolURL(false)) => {
  return genericFetch(orcChildrenURL(url));
};

const departmentFetch = () => {
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
  });

  return children;
};

async function fullCoursesURLScrape(source, courses = []) {
  const children = childrenScrape(source);
  const promises = [];

  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];

    if (child.hasChildren) {
      promises.push(new Promise((resolve, reject) => {
        childrenFetch(`${rootURL}${child.url}`)
          .then((newSource) => {
            fullCoursesURLScrape(newSource, courses)
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
        url: `${rootURL}${child.url}`,
      });
    }
  }

  await Promise.all(promises);

  return courses;
}

const courseScrape = (source) => {
  const data = cheerio.load(source);
  const body = data('div[id=rightpanel] > div[id=main]');

  const title = body.find('h1').first();
  const description = body.find('div[class=desc]').first();
  const instructor = body.find('div[id=instructor]').first().eq(1);
  const offered = body.find('div[id=offered]').first().eq(1);
  const sections = body.find('h3');

  const course = {};

  if (title) {
    course.title = title.text().trim();
  }

  if (description) {
    course.description = description.text().trim();
  }

  if (instructor) {
    course.instructor = instructor.text().trim();
  }

  if (offered) {
    course.offered = offered.text().trim();
  }

  console.log(sections.length);
  sections.each((sectionIndex, sectionEl) => {
    console.log(data(sectionEl).nextUntil('h3, div').text());
  });

  console.log(course);

  return course;
};

async function fullCoursesScrape(coursesBasic, coursesFull = []) {
  const promises = [];

  for (let i = 0; i < coursesBasic.length; i += 1) {
    const { subj, num, url } = coursesBasic[i];

    promises.push(new Promise((resolve, reject) => {
      genericFetch(url)
        .then((courseRaw) => {
          coursesFull[`${subj} ${num}`] = courseScrape(courseRaw);

          resolve();
        })
        .catch((err) => {
          console.log(url);
          console.log(err);
          reject(err);
        });
    }));
  }

  await Promise.all(promises);

  return coursesFull;
}

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
  fullCoursesURLScrape,
  fullCoursesScrape,
  supplementURLFetch,
  supplementURLScrape,
};
