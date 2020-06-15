import processScrape from './helpers/processScrape';

const scrape = (req, res) => {
  processScrape('timetable')
    .then((response) => {
      res.status(
        response.status === -1 ? 500 : 200,
      ).json(
        {
          msg: response.msg,
        },
      );
    })
    .catch((err) => {
      res.status(
        500,
      ).json(
        {
          err: err.message,
        },
      );
    });
};

const ScrapeController = {
  scrape,
};

export default ScrapeController;
