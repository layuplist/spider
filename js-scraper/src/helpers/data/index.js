import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import dotenv from 'dotenv';
import rimraf from 'rimraf';
import { version } from 'os';

dotenv.config();

// data repo url
const DATA_REPOSITORY_URL = 'https://github.com/D-Planner/data.git';
const LOCAL_DIR = '/tmp/data';

const loadCurrent = async () => {
    try {
        // clear /tmp/data
        rimraf.sync(LOCAL_DIR);

        await git.clone({
            fs,
            http,
            dir: LOCAL_DIR,
            url: DATA_REPOSITORY_URL,
            singleBranch: true,
            depth: 1,
            onAuth: () => ({
                username: process.env.GH_TOKEN,
            }),
        });

        return true;
    }
    catch (err) {
        return false;
    }
}

const update = async (target, sourceType, hash, msg) => {
    try {
        // move update local file with new
        fs.copyFileSync(`/tmp/${sourceType}_${hash}.json`, `${LOCAL_DIR}/${target}`);

        // update versions
        let versions = JSON.parse(fs.readFileSync(`${LOCAL_DIR}/versions.json`));
        versions.archive.timetable.push({
            timestamp: versions.current.timetable.timestamp,
            hash: versions.current.timetable.hash,
        });
        versions.current.timetable = {
            timestamp: new Date().toISOString(),
            hash,
        };
        fs.writeFileSync(`${LOCAL_DIR}/versions.json`, JSON.stringify(versions, null, 2));

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

        await git.commit({
            fs,
            dir: LOCAL_DIR,
            author: {
                name: 'D-Planner',
                email: 'dplanner.official@gmail.com',
            },
            message: msg,
        });

        await git.push({
            fs,
            http,
            dir: LOCAL_DIR,
            remote: 'origin',
            ref: 'master',
            onAuth: () => ({
                username: process.env.GH_TOKEN,
            }),
        });

        return true;
    }
    catch (err) {
        return false;
    }
}

const Data = {
    loadCurrent,
    update,
};

export default Data;
