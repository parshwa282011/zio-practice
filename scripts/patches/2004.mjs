import { P, FIG } from './helpers.mjs';

export default {
  problems: {
    3: {
      content: (b) => [
        b[0],
        b[1],
        P('For instance, consider the network of roads on the right connecting five cities A, B, C, D and E. Each line represents a road and the number next to the line represents the length of the road.'),
        FIG('figures/zio2004-p3-ex1.png', 'A road network on five cities A to E. Roads: A–B length 6, A–C 5, A–D 4, B–D 7, B–E 10, C–D 8, D–E 9.'),
        P('The shortest collection of roads to upgrade to expressways in this network is shown on the right:'),
        FIG('figures/zio2004-p3-ex2.png', 'The shortest collection of roads to upgrade in the example network: A–B, A–C, A–D, D–E.'),
        b[9],
      ],
      solution: () => [FIG('figures/zio2004-s3.png', 'Official solution to problem 3: the shortest collections of roads for networks (a), (b) and (c).')],
    },
    1: { solution: () => [FIG('figures/zio2004-s1.png', 'Official solution to problem 1 (several equally long sequences are valid).')] },
    4: { solution: () => [FIG('figures/zio2004-s4.png', 'Official solution to problem 4: the stacking diagrams and valid packings for (a), (b) and (c).')] },
    5: { solution: () => [FIG('figures/zio2004-s5.png', 'Official solution to problem 5: a consistent mode setting for each case.')] },
  },
};
