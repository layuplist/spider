import fs from 'fs';
import dotenv from 'dotenv';
import stringify from 'json-stable-stringify';

import { getMethodsForType } from './helpers';
import {
  loadCurrent,
  update,
} from '../../helpers/data';
import diff from '../../helpers/diff';
import {
  createPr,
} from '../../helpers/github';

dotenv.config();

const whitelist = process.env.CHANGE_WHITELIST.split(',');

const scrape = async (req, res) => {
  console.info(`[MEMORY USAGE] ${process.memoryUsage().rss}, initial`);

  const { type } = req.query;

  // verify eligible type
  if (!['timetable', 'orc'].includes(type)) {
    return res.status(400).send({ err: `Invalid scrape type: '${type}'` });
  }

  // load most recent data from repo
  await loadCurrent()
    .catch((err) => {
      console.error(err.stack);

      return res.status(500).send({ err: 'Failed to load repo' });
    });

  console.info(`[MEMORY USAGE] ${process.memoryUsage().rss}, after loading data repository`);

  // get appropriate  methods
  const { fetch, parse } = getMethodsForType(type);

  // send response
  res.send({ msg: 'Task started and current data loaded successfully. See server logs for task result.' });

  // get raw data
  const { hash, data } = await fetch(res)
    .catch((err) => {
      return console.error(`Error fetching ${type}`, err.stack);
    });

  console.info(`[MEMORY USAGE] ${process.memoryUsage().rss}, after fetching current timetable data`);

  // load versions file
  const versions = JSON.parse(
    fs.readFileSync('/tmp/data/versions.json'),
  );

  console.info(`[MEMORY USAGE] ${process.memoryUsage().rss}, after loading versions file into memory`);

  // check for changes, return early if none
  if (versions.current[type]?.hash === hash) {
    return console.log(`No changes detected for ${type}`);
  }

  // parse raw data and write to local
  const nextData = parse(data);
  fs.writeFileSync(
    `/tmp/${type}_${hash}.json`,
    stringify(nextData, { space: 2 }),
  );

  // get current parsed data from repo
  const currData = JSON.parse(
    fs.readFileSync(`/tmp/data/current/${type}.json`),
  );

  console.info(`[MEMORY USAGE] ${process.memoryUsage().rss}, after loading previous timetable data`);

  // run diff to determine changes
  const changes = diff(currData, nextData);

  console.info(`[MEMORY USAGE] ${process.memoryUsage().rss}, after running diff`);

  // check if eligible for direct commit to master
  const eligible = changes.removed.length === 0 && Object.values(changes.changed).reduce((whitelisted, item) => {
    return whitelisted && item.changed.reduce((valid, field) => {
      return valid && whitelist.includes(`${type}_${field}`);
    }, true);
  }, true);

  console.info(`[MEMORY USAGE] ${process.memoryUsage().rss}, after checking changes against whitelist`);

  const branch = eligible ? 'master' : `${type}_${new Date().getTime()}`;

  // generate list of ids of all updated courses
  const ids = [...changes.added, ...changes.removed, ...Object.keys(changes.changed)];

  // update repo
  await update(
    `current/${type}.json`,
    type,
    hash,
    ids,
    `update in ${type} (${new Date().toISOString()})`,
    branch,
  )
    .catch((err) => {
      console.error(`Failed to update repository (${err.message})`);
    });

  if (branch !== 'master') {
    createPr(branch, changes, whitelist, currData, nextData);
  }

  return console.log(`Changes detected and pushed for ${type}`);
};

const ScrapeController = {
  scrape,
};

export default ScrapeController;
