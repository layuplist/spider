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
 * Get item by id from keyed dictionary
 *
 * @param {*} id id of item to get
 * @param {*} items keyed dictionary, MUST contain id
 */
export const getItemById = (id, items) => {
  return (
    items.filter((item) => {
      return item.CRN === id;
    })[0]
  );
};

/**
 * Shallow diff two arrays of objects
 *
 * @param {*} curr current array of objects
 * @param {*} next next array of objects
 */
export const diff = (curr, next) => {
  const currIds = new Set(curr.map((item) => { return item.CRN; }));
  const nextIds = new Set(next.map((item) => { return item.CRN; }));

  const added = new Set([...nextIds].filter((id) => {
    return !currIds.has(id);
  }));
  const removed = new Set([...currIds].filter((id) => {
    return !nextIds.has(id);
  }));
  const persisted = new Set([...currIds].filter((id) => {
    return nextIds.has(id);
  }));

  const changed = {};
  persisted.forEach((id) => {
    const changes = compare(getItemById(id, curr), getItemById(id, next));
    if (Object.keys(changes).length > 0) {
      changed[id] = changes;
    }
  });

  return {
    added,
    removed,
    changed,
  };
};
