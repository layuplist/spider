import axios from 'axios';
import dotenv from 'dotenv';

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

export const createPr = async (branch, approvalsNeeded) => {
  const res = await axios.post(`${GH_API_ROOT}/repos/d-planner/data/pulls`, {
    title: `Unconfirmed Changes (${branch})`,
    head: branch,
    base: 'master',
    body: `\
# Unconfirmed Changes (${branch})

D-Planner/scraper has found changes in ${branch} that require approval (see below) and cannot \
be merged automatically. Please review these before merging. If you think these changes should \
have been automatically merged, please adjust your approval thresholds in the environment).

## Approvals Needed
${approvalsNeeded.map((approval) => { return `- ${approval}`; }).join('\n')}

## Reviewers

- @D-Planner`,
    maintainer_can_modify: true,
  },
  {
    auth: {
      username: 'dplanner-dev',
      password: process.env.GH_TOKEN,
    },
  })
    .catch((err) => {
      console.error(`Failed to create PR for data/${branch} (${err.message})\n`, err.response.data);
    });

  if (res) {
    console.info('Successfully created pull request');
    return res.statusCode === 201;
  } else {
    console.error('Error creating pull request');
    return null;
  }
};

export const updatePr = async (branch, approvalsNeeded) => {
  const { data: pulls } = await axios.get(`${GH_API_ROOT}/repos/d-planner/data/pulls`);
  const pull = pulls.find((p) => {
    return p.head.ref === branch && p.state === 'open';
  });

  if (!pull) {
    return createPr(branch, approvalsNeeded);
  }

  const res = await axios.post(`${GH_API_ROOT}/repos/d-planner/data/issues/${pull.number}/comments`, {
    body: `\
Additional changes were found on this PR that require approval:
${approvalsNeeded.map((approval) => { return `- ${approval}`; }).join('\n')}`,
  },
  {
    auth: {
      username: 'dplanner-dev',
      password: process.env.GH_TOKEN,
    },
  });

  if (res) {
    console.info('Successfully commented on pull request');
    return res.statusCode === 201;
  } else {
    console.error('Error commenting on pull request');
    return null;
  }
};
