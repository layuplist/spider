const currentStatus = (req, res) => {
    res.json({
        'timetable': 'not started',
        'prereqs': 'not started',
        'majors': 'not started',
    });
};

const StatusController = {
    currentStatus,
};

export default StatusController;
