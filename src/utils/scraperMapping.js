import {
  timetableFetch,
  timetableParse,
  orcFetch,
  orcParse,
} from '../scrapers';

/**
 * Returns appropriate fetch and parse methods for data type
 *
 * @param {*} type datatype (timetable, orc)
 */
// eslint-disable-next-line import/prefer-default-export
export const getMethodsForType = (type) => {
  switch (type) {
    case 'timetable':
      return {
        fetch: timetableFetch,
        parse: timetableParse,
      };

    case 'orc':
      return {
        fetch: orcFetch,
        parse: orcParse,
      };

    default:
      return {
        fetch: null,
        parse: null,
      };
  }
};
