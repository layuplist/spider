import axios from 'axios';
import cheerio from 'cheerio';
import { hash64 } from 'xxhash';
import qs from 'querystring';

import { timetablePropertyMap } from './utils/index';

// * CONFIG

const TIMETABLE_URL = 'https://oracle-www.dartmouth.edu/dart/groucho/timetable.display_courses';

const TIMETABLE_PARAMS = {
  distribradio: 'alldistribs',
  depts: 'no_value',
  periods: 'no_value',
  distribs: 'no_value',
  distribs_i: 'no_value',
  distribs_wc: 'no_value',
  distribs_lang: 'no_value',
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
  deliveryradio: 'alldelivery',
  subjectradio: 'allsubjects',
  hoursradio: 'allhours',
  sortorder: 'dept',
};

const TIMETABLE_CONFIG = {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
};

// eslint-disable-next-line no-useless-escape
const TEXT_REGEX = /^javascript:reqmat_window\('([^']+)'\)$/m;

// * FETCH

const fetch = async (_res) => {
  const res = await axios.post(TIMETABLE_URL, qs.stringify(TIMETABLE_PARAMS), TIMETABLE_CONFIG);
  console.log(res);
  if (res) {
    const hash = hash64(Buffer.from(res.data), Buffer.from('DPLANNER'), 'hex');

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
      if (headers[columnIndex] === 'Title') {
        // get desc link
        [, course.description] = data(columnEl).find('a').first().attr('href')
          .split('\'');
        // parse title
        course.title = data(columnEl).text().trim();
      } else if (headers[columnIndex] === 'Num') {
        course.number = Number(data(columnEl).text().trim());
      } else if (headers[columnIndex] === 'Text') {
        const textHref = data(columnEl).find('a').first().attr('href');
        const [, textUrl] = TEXT_REGEX.exec(textHref);
        course.text = textUrl;
      } else {
        const value = data(columnEl).text().trim();
        course[timetablePropertyMap[headers[columnIndex]]] = (
          value.length === 0 ? null : value
        );
      }
    });

    courses[`${course.subject}-${course.number}-${course.term}-${course.section}`] = course;
  });

  // return course data
  return courses;
};

// * export

export {
  fetch,
  parse,
};
