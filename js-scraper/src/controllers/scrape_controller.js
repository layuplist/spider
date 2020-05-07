import Timetable from '../scrapers/timetable';

const scrape = (req, res) => {
    // run scrape
    // download timetable
    Timetable.fetch()
        .then(({ hash, data }) => {
            // scan courses
            const courseData = Timetable.parseCourses(data);

            return res.json({
                hash: hash,
                courses: courseData,
            });
        })
        .catch((err) => {
            return res.status(500).json({
                msg: `Scrape failed: ${err}`,
            });
        });
};

const ScrapeController = {
    scrape,
}

export default ScrapeController;
