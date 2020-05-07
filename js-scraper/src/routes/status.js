import { Router } from 'express';
import StatusController from '../controllers/status_controller';

const statusRouter = Router();

/**
 * @api {get} / get current scrape status
 * @apiName Status
 * @apiGroup Status
 * 
 * @apiSuccess {Object} current status of each scrape target
 * @apiSuccessExample Success-Response:
 *      HTTP/1.1 200 OK
 *      {
 *          "timetable": "complete",
 *          "orc": "in progress",
 *          "majors": "not started"
 *      }
 */
statusRouter.get('/', StatusController.currentStatus);

export default statusRouter;
