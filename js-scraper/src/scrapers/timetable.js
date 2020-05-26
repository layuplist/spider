import axios from 'axios';
import cheerio from 'cheerio';
import XXHash from 'xxhash';
import qs from 'querystring';

const timetableURL = 'https://oracle-www.dartmouth.edu/dart/groucho/timetable.display_courses';
const timetableParams = {
    distribradio: 'alldistribs',
    depts: 'no_value',
    periods: 'no_value',
    distribs: 'no_value',
    distribs_i: 'no_value',
    distribs_wc: 'no_value',
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
    subjectradio: 'allsubjects',
    hoursradio: 'allhours',
    sortorder: 'dept',
};
const timetableConfig = {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
};

const fetch = () => {
    return axios.post(timetableURL, qs.stringify(timetableParams), timetableConfig)
        .then((res) => {
            // generate hash
            let hash = XXHash.hash64(Buffer.from(res.data), Buffer.from('DPLANNER'), 'hex');

            // return hash & data
            return {
                hash: hash,
                data: res.data,
            };
        })
        .catch((err) => {
            let errMsg = `Error fetching timetable: ${err}`;

            //log error
            console.log(errMsg);

            // return error msg
            return {
                msg: errMsg,
            };
        });
};

const parseCourses = (source) => {
    // create cheerio object and filter out relevant table rows
    const data = cheerio.load(source);
    const keys = data('div[class=data-table] > table > tbody > tr').first();
    const rows = data('div[class=data-table] > table > tbody > tr').not(keys);

    // get timetable headers
    const headers = [];
    keys.find('th').each(function(_i, el) {
        headers.push(data(this).text());
    })

    // get courses
    const courses = []
    rows.each(function(course_index, _el) {
        courses[course_index] = {};
        data(this).find('td').each(function(column_index, _el) {
            courses[course_index][headers[column_index]] = data(this).text();
        });
    });

    // return course data
    return courses;
};

const Timetable = {
    fetch,
    parseCourses,
};

export default Timetable;
