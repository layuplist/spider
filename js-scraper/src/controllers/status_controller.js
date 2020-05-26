import Data from '../helpers/data';

const currentStatus = (req, res) => {
    // res.json({
    //     'timetable': 'not started',
    //     'prereqs': 'not started',
    //     'majors': 'not started',
    // });
    console.log('flag')
    let success = Data.loadCurrent();
    console.log(success)
};

const StatusController = {
    currentStatus,
};

export default StatusController;
