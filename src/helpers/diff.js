/**
 * Shallow diff for two objects
 *
 * @param {*} a current object state
 * @param {*} b next object state
 */
const compare = (a, b) => {
  // get property names
  const aProps = new Set(Object.getOwnPropertyNames(a));
  const bProps = new Set(Object.getOwnPropertyNames(b));

  // determine additions, deletions, and persisting items
  // through basic set arithmetic
  const added = new Set([...bProps].filter((prop) => {
    return !aProps.has(prop);
  }));
  const removed = new Set([...aProps].filter((prop) => {
    return !bProps.has(prop);
  }));
  const persisted = new Set([...aProps].filter((prop) => {
    return bProps.has(prop);
  }));

  // find all changed properties
  const changed = [];
  persisted.forEach((prop) => {
    if (a[prop] !== b[prop]) {
      changed.push(prop);
    }
  });

  // return all additions, deletions, and changes
  const result = {};
  if (added.length > 0) {
    result.added = added;
  }
  if (removed.length > 0) {
    result.removed = removed;
  }
  if (changed.length > 0) {
    result.changed = changed;
  }

  return result;
};

/**
 * Shallow diff two arrays of objects
 *
 * @param {*} curr current array of objects
 * @param {*} next next array of objects
 */
export default (curr, next) => {
  const currIds = new Set(Object.keys(curr));
  const nextIds = new Set(Object.keys(next));

  const added = new Set([...nextIds].filter((id) => {
    return !currIds.has(id);
  }));
  const removed = new Set([...currIds].filter((id) => {
    return !nextIds.has(id);
  }));
  const persisted = new Set([...currIds].filter((id) => {
    return nextIds.has(id);
  }));

  const changed = Array.from(persisted).reduce((accum, id) => {
    const changes = compare(curr[id], next[id]);
    if (Object.keys(changes).length > 0) {
      accum[id] = changes;
    }

    return accum;
  }, {});

  return {
    added: Array.from(added),
    removed: Array.from(removed),
    changed,
  };
};
