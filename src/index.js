import fs from 'fs';
import dotenv from 'dotenv';
import stringify from 'json-stable-stringify';
import serverless from 'serverless-http';
import express from 'express';

import { getMethodsForType } from './utils/scraperMapping';
import {
  loadCurrent,
  update,
} from './utils/data';
import diff from './utils/diff';
import {
  createPr,
} from './utils/github';

dotenv.config();

const process = async (req, res) => {
  const { type } = JSON.parse(req.body);

  // verify eligible type
  if (!['timetable', 'orc'].includes(type)) {
    return res.status(400).send({ err: `Invalid scrape type: '${type}'` });
  }

  console.info('Starting scrape', type);

  // load most recent data from repo
  await loadCurrent()
    .catch((err) => {
      console.error(err.stack);

      return res.status(500).send({ err: 'Failed to load repo' });
    });

  console.info('Loaded current data');

  // get appropriate  methods
  const { fetch, parse } = getMethodsForType(type);

  // send response
  res.send({ msg: 'Task started and current data loaded successfully. See server logs for task result.' });

  // get raw data
  const { hash, data } = await fetch(res)
    .catch((err) => {
      return console.error(`Error fetching ${type}`, err.stack);
    });

  console.info('Completed new scrape');

  // load versions file
  const versions = JSON.parse(
    fs.readFileSync('/tmp/data/versions.json'),
  );

  // check for changes, return early if none
  if (versions.current[type]?.hash === hash) {
    return console.info(`No changes detected for ${type}`);
  }

  console.info('Hash changed, comparing content.');

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

  // run diff to determine changes
  const changes = diff(currData, nextData);

  console.info('Compared content');

  // check if eligible for direct commit to master
  const approvalsNeeded = [];
  const totalCourseCount = Object.keys(currData).length;
  console.info(totalCourseCount);
  // changes per field
  const changesPerField = Object.values(changes.changed)
    .reduce((acc, cur) => {
      [...cur.changed, ...cur.added, ...cur.removed].forEach((field) => {
        acc[field] = (acc[field] || 0) + 1;
      });
      return acc;
    }, {});
  console.info(changesPerField);
  Object.keys(changesPerField)
    .forEach((key) => {
      changesPerField[key] /= totalCourseCount;
    });
  console.info(changesPerField);
  Object.entries(changesPerField).forEach(([field, rate]) => {
    const threshold = parseFloat(
      process.env[`CHANGES_${field.toUpperCase()}_APPROVAL_THRESHOLD`]
        || process.env.CHANGES_DEFAULT_APPROVAL_THRESHOLD,
    );
    if (rate > threshold) {
      approvalsNeeded.push(`${field} has been changed in ${rate * 100}% of courses (> ${threshold * 100}%)`);
    }
  });
  // removals
  const removedThreshold = parseFloat(process.env.REMOVED_DEFAULT_APPROVAL_THRESHOLD);
  const removedRate = changes.removed.length / totalCourseCount;
  if (removedRate > removedThreshold) {
    approvalsNeeded.push(`${removedRate * 100}% courses were removed (> ${removedThreshold * 100}%)`);
  }
  // additions
  const addedThreshold = parseFloat(process.env.ADDED_DEFAULT_APPROVAL_THRESHOLD);
  const addedRate = changes.added.length / totalCourseCount;
  if (addedRate > addedThreshold) {
    approvalsNeeded.push(`${addedRate * 100}% courses were added (> ${addedThreshold * 100}%)`)
  }
  // overall eligibility for direct merge
  const eligible = approvalsNeeded.length === 0;
  console.info('Approvals needed:', approvalsNeeded);

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
    createPr(branch, approvalsNeeded);
  }

  return console.log(`Changes detected and pushed for ${type}`);
};

const app = express();
app.use(express.json());
app.get('/', process);

export default serverless(app);