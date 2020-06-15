import { Router } from 'express';
import ScrapeController from '../controllers/scrape/controller';

const scrapeRouter = Router();

/**
 * @api {get} / run full scrape script
 * @apiName Scrape Full
 * @apiGroup Scrape
 *
 * @apiSuccess {Object} test output of scrape script
 */
scrapeRouter.get('/', ScrapeController.scrape);

export default scrapeRouter;
