import fs from 'fs';

import {
  timetableFetch,
  timetableParse,
} from '../../../scrapers';
import {
  loadCurrent,
  update,
} from '../../../helpers/data';
import { diff } from '../../../helpers/diff';

/**
 * Returns appropriate fetch and parse methods for data type
 *
 * @param {*} type datatype (timetable, prereqs, etc.)
 */
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

/**
 * Asynchronously processes scrape for a single type
 *
 * @param {*} type datatype (timetable, prereqs, etc.)
 */
export default async function processScrape(type) {
  // get methods
  const { fetch, parse } = getMethodsForType(type);

  // get raw data
  const { hash, data } = await fetch();

  // load most recent data from repo
  await loadCurrent()
    .catch((err) => {
      console.error(err.stack);

      return {
        status: -1,
        msg: 'Failed to load repo',
      };
    });

  // load versions file
  const versions = JSON.parse(
    fs.readFileSync('/tmp/data/versions.json'),
  );
  console.log(versions.current[type], hash);
  // check for changes, return early if none
  if (versions.current[type].hash === hash) {
    return {
      status: 0,
      msg: `No changes detected for ${type}`,
    };
  }

  // get current parsed data from repo
  const currData = JSON.parse(
    fs.readFileSync(`/tmp/data/current/${type}.json`),
  );

  // parse raw data and write to local
  const nextData = parse(data);
  fs.writeFileSync(
    `/tmp/${type}_${hash}.json`,
    JSON.stringify(nextData, null, 2),
  );

  // run diff to determine changes
  const changes = diff(currData, nextData);

  // ! temp debug
  console.log(changes);
  console.log(changes.changed);

  // update repo
  await update(
    `current/${type}.json`,
    type,
    hash,
    `update in ${type} (${new Date().toISOString()})`,
  )
    .catch((err) => {
      console.error(err.stack);

      return {
        status: -1,
        msg: 'Failed to update repo',
      };
    });

  return {
    status: 1,
    msg: `Changes detected and pushed for ${type}`,
  };
}
