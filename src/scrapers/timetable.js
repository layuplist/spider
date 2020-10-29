import axios from 'axios';
import cheerio from 'cheerio';
import XXHash from 'xxhash';
import qs from 'querystring';


// * CONFIG

const timetableURL = 'https://oracle-www.dartmouth.edu/dart/groucho/timetable.display_courses';

const timetableParams = {
  distribradio: 'alldistribs',
  depts: 'no_value',
  periods: 'no_value',
  distribs: 'no_value',
  distribs_i: 'no_value',
  distribs_wc: 'no_value',
  deliverymodes: 'no_value',
  pmode: 'public',
  term: '',
  levl: '',
  fys: 'n',
  wrt: 'n',
  pe: 'n',
  review: 'n',
  crnl: 'no_value',
  classyear: '2008',
  searchtype: 'Subject Area(s)',
  termradio: 'allterms',
  terms: 'no_value',
  deliveryradio: 'selectdelivery',
  subjectradio: 'allsubjects',
  hoursradio: 'allhours',
  sortorder: 'dept',
};

const timetableConfig = {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
};

// eslint-disable-next-line no-useless-escape
const titleRegex = /(.*?)(?:\s\(((?:Remote|On Campus|Individualized)[^\)]*)\))?(\(.*\))?$/i;


// * FETCH

const fetch = async (_res) => {
  const res = await axios.post(timetableURL, qs.stringify(timetableParams), timetableConfig);

  if (res) {
    const hash = XXHash.hash64(Buffer.from(res.data), Buffer.from('DPLANNER'), 'hex');

    return {
      hash,
      data: res.data,
    };
  } else {
    return null;
  }
};


// * PARSE

const parse = (source) => {
  // create cheerio object and filter out relevant table rows
  const data = cheerio.load(source);
  const keys = data('div[class=data-table] > table > tbody > tr').first();
  const rows = data('div[class=data-table] > table > tbody > tr').not(keys);

  // get timetable headers
  const headers = [];
  keys.find('th').each((_i, headerEl) => {
    headers.push(data(headerEl).text());
  });

  // get courses
  const courses = {};
  rows.each((_index, courseEl) => {
    const course = {};

    // get properties
    data(courseEl).find('td').each((columnIndex, columnEl) => {
      // check for course link (special field)
      if (headers[columnIndex] === 'Title and Delivery Mode') {
        // get desc link
        [, course.Description] = data(columnEl).find('a').first().attr('href')
          .split('\'');

        // parse title
        const [, courseTitle, courseDeliveryMode, courseTitleAddendum] = titleRegex.exec(data(columnEl).text().trim());

        // set props
        course.Title = courseTitle + (courseTitleAddendum ? ` ${courseTitleAddendum}` : '');
        course.DeliveryMode = courseDeliveryMode;
      } else {
        const value = data(columnEl).text().trim();
        course[headers[columnIndex]] = (
          value.length === 0 ? null : value
        );
      }
    });

    courses[`${course.Term}-${course.Subj}-${course.Num}-${course.Sec}`] = course;
  });

  // return course data
  return courses;
};

// * export

export {
  fetch,
  parse,
};
