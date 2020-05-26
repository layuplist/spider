import Timetable from '../scrapers/timetable';
import fs from 'fs';
import Data from '../helpers/data';

const scrape = (req, res) => {
    // run scrape
    // download timetable
    Timetable.fetch()
        .then(({ hash, data }) => {
            // scan courses
            const courseData = Timetable.parseCourses(data);

            // write timetable
            fs.writeFileSync(`/tmp/timetable_${hash}.json`, JSON.stringify(courseData, null, 2));

            // load current data
            Data.loadCurrent().then(success => {
                if (!success) {
                    return res.status(500).json({
                        msg: 'Scrape succeeded, but github update failed.',
                    })
                } else {
                    // load current version data
                    let versions = JSON.parse(fs.readFileSync('/tmp/data/versions.json'));

                    // check for new data
                    if (versions.current.timetable.hash !== hash) {
                        console.log('Hash mismatch for Timetable, pushing new files.');

                        // commit and push new timetable data
                        Data.update(
                            'current/timetable.json',
                            'timetable',
                            hash,
                            `timetable changed ${new Date().toISOString()}`
                        ).then(success => {
                            if (success) {
                                return res.json({
                                    msg: `Timetable updated with hash ${hash}.`
                                });
                            } else {
                                return res.status(500).json({
                                    msg: 'Failed: Error updating D-Planner/data.'
                                });
                            }
                        })
                    } else {
                        return res.json({
                            msg: 'No changes detected in Timetable.',
                        });
                    }
                }
            })
        })
        .catch((err) => {
            return res.status(500).json({
                msg: `Failed: ${err}`,
            });
        });
};

const ScrapeController = {
    scrape,
}

export default ScrapeController;
