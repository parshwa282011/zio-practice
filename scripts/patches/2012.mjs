import { PRE } from './helpers.mjs';

export default {
  problems: {
    2: {
      // the eight arrangements are a preformatted list, one per line
      content: (b) => [b[0], b[1], PRE(['1 1 1 1', '1 1 2', '1 2 1', '1 3', '2 1 1', '2 2', '3 1', '4'].join('\n')), ...b.slice(10)],
    },
  },
};
