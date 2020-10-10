import {
  timetableFetch,
  timetableParse,
} from '../../../scrapers';

/**
 * Returns appropriate fetch and parse methods for data type
 *
 * @param {*} type datatype (timetable, prereqs, etc.)
 */
// eslint-disable-next-line import/prefer-default-export
export const getMethodsForType = (type) => {
  switch (type) {
    case 'timetable':
      return {
        fetch: timetableFetch,
        parse: timetableParse,
      };

    default:
      return {
        fetch: null,
        parse: null,
      };
  }
};