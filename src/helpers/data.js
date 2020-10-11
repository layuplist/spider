import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import dotenv from 'dotenv';
import rimraf from 'rimraf';

dotenv.config();

// data repo url
const DATA_REPOSITORY_URL = 'https://github.com/D-Planner/data.git';
const LOCAL_DIR = '/tmp/data';

const loadCurrent = async () => {
  // clear /tmp/data
  rimraf.sync(LOCAL_DIR);

  await git.clone({
    fs,
    http,
    dir: LOCAL_DIR,
    url: DATA_REPOSITORY_URL,
    singleBranch: true,
    depth: 1,
    onAuth: () => {
      return ({
        username: process.env.GH_TOKEN,
      });
    },
  });
};

const update = async (target, sourceType, hash, msg) => {
  // * update local

  // copy in new data
  fs.copyFileSync(`/tmp/${sourceType}_${hash}.json`, `${LOCAL_DIR}/${target}`);

  // update versions file
  const versions = JSON.parse(fs.readFileSync(`${LOCAL_DIR}/versions.json`));
  if (!versions.archive[sourceType]) versions.archive[sourceType] = [];
  versions.archive[sourceType].push({
    timestamp: versions.current[sourceType]?.timestamp,
    hash: versions.current[sourceType]?.hash,
  });
  versions.current[sourceType] = {
    timestamp: new Date().toISOString(),
    hash,
  };
  fs.writeFileSync(`${LOCAL_DIR}/versions.json`, JSON.stringify(versions, null, 2));

  // * add files to commit

  await git.add({
    fs,
    dir: LOCAL_DIR,
    filepath: target,
  });

  await git.add({
    fs,
    dir: LOCAL_DIR,
    filepath: 'versions.json',
  });

  // * commit

  await git.commit({
    fs,
    dir: LOCAL_DIR,
    author: {
      name: 'D-Planner',
      email: 'dplanner.official@gmail.com',
    },
    message: msg,
  });

  // * push to repo

  await git.push({
    fs,
    http,
    dir: LOCAL_DIR,
    remote: 'origin',
    ref: 'master',
    onAuth: () => {
      return ({
        username: process.env.GH_TOKEN,
      });
    },
  });
};

export {
  loadCurrent,
  update,
};
