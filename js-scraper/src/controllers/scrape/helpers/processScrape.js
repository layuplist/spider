import fs from 'fs';

import {
  timetableFetch,
  timetableParse,
} from '../../../scrapers';
import Data from '../../../helpers/data';

const getMethodsForType = (type) => {
  switch (type) {
    case 'timetable':
      return {
        fetch: timetableFetch,
        parse: timetableParse,
      };

    default:
      return {
        fetch: null,
        parse: null,
      };
  }
};

export default async function processScrape(type) {
  // get methods
  const { fetch, parse } = getMethodsForType(type);

  // get raw data
  const { hash, data } = await fetch();

  // load most recent data from repo
  if (!await Data.loadCurrent()) {
    return {
      status: -1,
      msg: 'Failed to load repo',
    };
  }

  // load versions file
  const versions = JSON.parse(
    fs.readFileSync('/tmp/data/versions.json'),
  );

  // check for changes, return early if none
  if (versions.current[type].hash !== hash) {
    return {
      status: 0,
      msg: `No changes detected for ${type}`,
    };
  }

  // parse raw data and write to local
  const parsedData = parse(data);
  fs.writeFileSync(
    `/tmp/${type}_${hash}.json`,
    JSON.stringify(parsedData, null, 2),
  );

  // update repo
  if (!await Data.update(
    `current/${type}.json`,
    type,
    hash,
    `update in ${type} (${new Date().toISOString()})`,
  )) {
    return {
      status: -1,
      msg: 'Failed to update repo',
    };
  }

  return {
    status: 1,
    msg: `Changed detected and pushed for ${type}`,
  };
}
