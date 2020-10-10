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
      throw err;
    });
};

const childrenFetch = (url = orcSchoolURL(false)) => {
  return genericFetch(orcChildrenURL(url));
};

// const departmentFetch = () => {
//   // TODO
// };

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

  sections.each((_sectionIndex, sectionEl) => {
    const sectionName = data(sectionEl).text().trim();
    let sectionData = String();

    // read data up till next section
    let currEl = sectionEl;
    while (currEl.nextSibling && !data(currEl.nextSibling).is('h3, div')) {
      currEl = currEl.nextSibling;
      sectionData += currEl.data;
    }

    // add prop
    switch (sectionName) {
      case 'Instructor':
        course.instructor = sectionData;
        break;
      case 'Cross Listed Courses':
        course.xlist = sectionData;
        break;
      case 'Distributive and/or World Culture':
        course.distrib = sectionData;
        break;
      case 'Offered':
        course.offered = sectionData;
        break;
      default:
        break;
    }
  });

  return course;
};

async function fullCoursesScrape(coursesBasic, coursesFull = []) {
  let promises = [];
  const status = coursesBasic.reduce((accum, course) => {
    accum[course.url] = {
      course,
      attempts: 0,
      success: false,
    };

    return accum;
  });

  const createPromise = ({ subj, num, url }) => {
    status[url].attempts += 1;

    promises.push(new Promise((resolve) => {
      genericFetch(url)
        .then((courseRaw) => {
          coursesFull[`${subj} ${num}`] = courseScrape(courseRaw);

          status[url].success = true;
          console.log('Success!', Object.values(status).filter((s) => { return s.success; }).length);
          resolve();
        })
        .catch((err) => {
          console.log(`Failed to load ${url} (attempt ${status[url].attempts}): ${err}`);

          resolve();
        });
    }));
  };

  coursesBasic.forEach((course) => {
    status[course.url] = {
      attempts: 0,
      result: false,
    };
    createPromise(course);
  });

  let pending = coursesBasic;

  while (pending.length > 0) {
    pending.forEach((course) => { createPromise(course); });

    // eslint-disable-next-line no-await-in-loop
    await Promise.all(promises);

    promises = [];
    pending = Object.values(status).filter((s) => { return s.success && s.attempts < 3; }).map((s) => { return s.course; });
  }

  console.log(`${Object.values(status).filter((s) => { return s.success; }).length} completed of ${coursesBasic.length}`);

  return coursesFull;
}

// * supplement scrape (new courses only)

// * fetch

const supplementURLFetch = (year) => {
  return axios.post(orcSupplementURL(year))
    .then((res) => {
      // generate hash
      const hash = XXHash.hash64(Buffer.from(res.data), Buffer.from('DPLANNER'), 'hex');

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