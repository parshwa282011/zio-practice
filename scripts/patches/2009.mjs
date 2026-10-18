import { FIG } from './helpers.mjs';

export default {
  problems: {
    1: {
      content: (b) => [
        b[0],
        FIG('figures/zio2009-p1-tiles.png', 'The two tile types: a 1 × 2 rectangle and an L-shaped tile covering three squares.'),
        b[1],
        b[2],
        FIG('figures/zio2009-p1-ways.png', 'Four ways to tile a 2 × 4 room. The first three obey the Batlar Guntu rule; the fourth has four tiles meeting at a corner and does not.'),
        b[3],
        FIG('figures/zio2009-p1-ways3.png', 'The five ways to tile a 2 × 3 room.'),
        b[4],
      ],
    },
  },
};
