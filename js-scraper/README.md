# D-Planner Scraper

Scrapes various sites for Dartmouth class data, commits to [d-planner/data](https://github.com/D-Planner/data).

## Stack

- express
- cheerio
- isomorphic-git

## Architecture

```
src/
├── controllers/                         # interpret requests and manage high-level processes
├── scrapers/                            # retrieve and parse site data
├── helpers/                             # general helpers (i.e. git integration)
└── routes/                              # map routes to controllers
```

