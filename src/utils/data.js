import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import dotenv from 'dotenv';
import rimraf from 'rimraf';
import stringify from 'json-stable-stringify';

dotenv.config();

// data repo url
const DATA_REPOSITORY_URL = 'https://github.com/D-Planner/data.git';
const LOCAL_DIR = '/tmp/data';

const loadCurrent = async (type) => {
  // clear /tmp/data
  rimraf.sync(LOCAL_DIR);

  await git.clone({
    fs,
    http,
    dir: LOCAL_DIR,
    url: DATA_REPOSITORY_URL,
    depth: 1,
    onAuth: () => {
      return ({
        username: process.env.GH_TOKEN,
      });
    },
  });

  const branches = await git.listBranches({ fs, dir: LOCAL_DIR, remote: 'origin' });
  const typeBranch = branches.find((b) => { return b.startsWith(type); });
  if (typeBranch) {
    await git.checkout({ fs, dir: LOCAL_DIR, ref: typeBranch });
  }

  return typeBranch;
};

const update = async (target, sourceType, hash, ids, msg, branch) => {
  // * update local

  // if not already on target branch, create and checkout
  if (await git.currentBranch({ fs, dir: LOCAL_DIR }) !== branch) {
    await git.branch({
      fs,
      dir: LOCAL_DIR,
      ref: branch,
      checkout: true,
    });
    console.info(`Created branch ${branch}`);
  }

  // copy in new data
  fs.copyFileSync(`/tmp/${sourceType}_${hash}.json`, `${LOCAL_DIR}/${target}`);
  console.info('Updated data file');

  // update versions file
  const versions = JSON.parse(fs.readFileSync(`${LOCAL_DIR}/versions.json`));
  if (!versions.archive[sourceType]) versions.archive[sourceType] = [];
  versions.archive[sourceType].push(versions.current[sourceType]);
  versions.current[sourceType] = {
    timestamp: new Date().toISOString(),
    hash,
    changed: ids.join(','),
  };
  fs.writeFileSync(`${LOCAL_DIR}/versions.json`, stringify(versions, { space: 2 }));
  console.info('Updated versions file');

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
  console.info('Staged changes');

  // * commit

  const sha = await git.commit({
    fs,
    dir: LOCAL_DIR,
    author: {
      name: 'D-Planner',
      email: 'dplanner.official@gmail.com',
    },
    message: msg,
  });
  console.info(`Committed changes ${sha}`);

  // * push to repo

  if (sha) {
    await git.push({
      fs,
      http,
      dir: LOCAL_DIR,
      remote: 'origin',
      ref: branch,
      onAuth: () => {
        return ({
          username: process.env.GH_USERNAME,
          password: process.env.GH_TOKEN,
        });
      },
    });
    console.info('Changes pushed to repo');
  }
};

export {
  loadCurrent,
  update,
};
