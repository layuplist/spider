import axios from 'axios';
import dotenv from 'dotenv';
import stringify from 'json-stable-stringify';

dotenv.config();

const GH_API_ROOT = 'https://api.github.com';


export const hasActivePr = async (branch) => {
  const res = await axios.get(`${GH_API_ROOT}/repos/d-planner/data/pulls`, {
    auth: {
      username: 'dplanner-dev',
      password: process.env.GH_TOKEN,
    },
  })
    .catch((err) => {
      console.error(`Failed to check active PRs for data/${branch} (${err.message})`);
    });

  if (res) {
    return res.data.length > 0;
  } else {
    return null;
  }
};

export const createPr = async (branch, diff, whitelist, prev, next) => {
  const notableChanges = Object.entries(diff.changed).reduce((changes, [course, courseChanges]) => {
    const values = Array.from(Object.entries(courseChanges).reduce((all, [, val]) => {
      return new Set([...all, ...val]);
    }, new Set()));

    if (values.reduce((notable, field) => {
      return notable || !whitelist.includes(`${branch}_${field}`);
    }, false)) {
      changes[course] = values;
    }

    return changes;
  }, {});

  const changeTable = Object.entries(notableChanges).map(([id, changes]) => {
    return changes.map((field, index) => {
      return `| ${index === 0 ? id : ' '} | ${field} | ${prev[id][field]} | ${next[id][field]} |`;
    }).join('\n');
  }).join('\n');

  const additionText = diff.added.slice(0, 5).map((id) => {
    return stringify(next[id], { space: 2 });
  }).join(',\n');

  const removalText = diff.removed.slice(0, 5).map((id) => {
    return stringify(prev[id], { space: 2 });
  }).join(',\n');

  const res = await axios.post(`${GH_API_ROOT}/repos/d-planner/data/pulls`, {
    title: `Unconfirmed Changes (${branch})`,
    head: branch,
    base: 'master',
    body: `\
# Unconfirmed changes (${branch})

D-Planner/scraper has found changes in ${branch} that are _not_ whitelisted (see below). Please review these before merging. If you think these changes should have been automatically merged, please add them to the whitelist (\`CHANGE_WHITELIST\` environment variable).
${Object.keys(notableChanges).length > 0
    ? `
## Changes

| Course | Field Name | Current Value | Proposed Value |
|--------|------------|---------------|----------------|
${changeTable}` : '\x1B[F'}

## Additions

${diff.added.length > 0
    ? `\
\`\`\`json
${`${additionText}${diff.added.length > 10 ? '\n...' : ''}`}
\`\`\`` : '_No additions_'}

## Removals

${diff.removed.length > 0
    ? `\
\`\`\`json
${`${removalText}${diff.removed.length > 10 ? ',\n...' : ''}`}
\`\`\`` : '_No additions_'}

## Reviewers

- @D-Planner`,
    maintainer_can_modify: true,
  }, {
    auth: {
      username: 'dplanner-dev',
      password: process.env.GH_TOKEN,
    },
  })
    .catch((err) => {
      console.error(`Failed to create PR for data/${branch} (${err.message})`, err);
    });

  if (res) {
    return res.statusCode === 201;
  } else {
    return null;
  }
};
