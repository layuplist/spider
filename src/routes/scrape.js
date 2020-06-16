import { Router } from 'express';
import ScrapeController from '../controllers/scrape/controller';

const scrapeRouter = Router();

/**
 * @api {get} / run full scrape script
 * @apiName Scrape Full
 * @apiGroup Scrape
 *
 * @apiSuccess { msg } success/failure msg
 */
scrapeRouter.get('/', ScrapeController.scrape);

export default scrapeRouter;
