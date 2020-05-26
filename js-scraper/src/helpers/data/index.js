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

const update = async (target, source, msg) => {
    try {
        // move update local file with new
        fs.copyFileSync(source, `${LOCAL_DIR}/${target}`);
        console.log('copied files')
        await git.add({
            fs,
            dir: LOCAL_DIR,
            filepath: target,
        });
        console.log('added to git')
        await git.commit({
            fs,
            dir: LOCAL_DIR,
            author: {
                name: 'D-Planner',
                email: 'dplanner.official@gmail.com',
            },
            message: msg,
        });
        console.log('committed')
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
        console.log('pushed')
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
