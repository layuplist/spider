import fs from 'fs';
import cheerio from 'cheerio';
import request from 'sync-request';
import courses from '../../spider/data/courses.json';
import departmentsJson from '../../spider/data/departments.json';

const blanks = [];
const needChecking = [];


courses.forEach((c, j) => {
    if (!c.orc_url) {
        blanks.push(c.title)
        return;
    }
    try {
        const $ = cheerio.load(request('GET', c.orc_url)) // Load Data into Cheerio

        let getNext = false;
        let preReqText = '';
    
        $('div[id=main]')
              .contents()
              .each(function (i, elm) {
                if (elm.tagName === 'h3') getNext = false;
                if (getNext) {
                  preReqText += $(this).text().trim()
                    .split('Offered')[0]
                    .split('The Timetable of Class Meetings')[0]
                    .split('Please read the')[0];
                }
                if ($(this).text().trim().includes('Prerequisite')) {
                  // Get data immediatly following that which contains Prerequisite, which is always in a <h3> element
                  getNext = true;
                }
              });
        if (preReqText.length === 0) {
            console.log(j, "blank");
            blanks.push(c.title);
            return;
        }
    }
    catch (e) {
        needChecking.push(c.title);
    }
    
})

fs.writeFile('data/blanks.json', JSON.stringify(blanks), (e) => {
    if (e) throw e;
    console.log('Saved 1');
  });

  fs.writeFile('data/needsCheck.json', JSON.stringify(needChecking), (e) => {
    if (e) throw e;
    console.log('Saved 2');
  });