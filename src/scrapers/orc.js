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
  return year < 2018
    ? `${rootURL}/en/${year}s/Supplement/Courses`
    : `${rootURL}/${year}s/Supplement/New-Undergraduate-Courses`;
};

const orcChildrenURL = (path) => {
  return `${path}?getchildren=1`;
};

const courseRegex = /^[A-Z]+\s[0-9]+(.[0-9]+)?$/;


// * PARSE

const parseCourse = (source) => {
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

const parseAll = (source) => {
  return source.map((course) => {
    return {
      subj: course.subj,
      num: course.num,
      ...course.data,
    };
  });
};


// * URL CRAWL (FETCH)

const crawlChildren = (source) => {
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

const crawlURLs = async (source, courses = []) => {
  if (!source) {
    source = (await axios.get(orcSchoolURL())).data;
  }

  const children = crawlChildren(source);

  const promises = children.map(async (child) => {
    if (child.hasChildren) {
      const nextSource = (await axios.get(orcChildrenURL(`${rootURL}${child.url}`))).data;
      courses.concat(await crawlURLs(nextSource, courses));
    }

    if (child.isCourse) {
      const [subj, num] = child.text.split(' ');

      courses.push({
        subj,
        num,
        url: `${rootURL}${child.url}`,
      });
    }
  });

  await Promise.all(promises);

  return courses;
};

const fetchCourses = async (courses, write) => {
  await Promise.all(courses.filter((c) => { return !c.success; }).slice(0, 10)
    .map(async (c) => {
      c.data = parseCourse(
        (await axios.get(c.url, { timeout: 3500 })
          .catch((err) => {
            console.error(`Failed to fetch ${c.subj} ${c.num} (${err.message})`);
          })
        ).data,
      );
      c.success = true;
      console.log(`Successfully fetched ${c.subj} ${c.num}`);
    }));

  const remaining = courses.filter((c) => { return !c.success; });

  console.log(`Batch completed, ${remaining.length} remaining`);
  write('working...');

  if (remaining.length > 0) {
    return courses.filter((c) => { return c.success; })
      .concat(...await fetchCourses(remaining, write));
  } else {
    return courses;
  }
};

const fetchAll = async (write) => {
  const courses = await crawlURLs();

  return fetchCourses(courses, write);
};


// * SUPPLEMENTS

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
  fetchAll,
  parseAll,
  supplementURLFetch,
  supplementURLScrape,
};
