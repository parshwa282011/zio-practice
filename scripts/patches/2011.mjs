import { P, FIG, MATH } from './helpers.mjs';

export default {
  problems: {
    1: {
      content: () => [
        P('A new IT Park has $N$ north-south roads and $N$ east-west roads laid out in an $N$ × $N$ grid. A security guard who is posted at the intersection of two roads can observe all activity along the length of both roads.'),
        P('There are $N$ guards. Initially, the guards are placed haphazardly at some of the intersections. The guards have to be moved into new positions so that each road is under observation by at least one guard. While moving the guards around, we also have to ensure that we never have two guards at the same intersection.'),
        P('The aim is to do this in such a way as to minimize the total distance travelled by the guards. We count the distance travelled by guards in steps: in one step, a guard can shift to an adjacent intersection.'),
        P('For example, suppose there are 4 roads in each direction and 4 guards placed as shown in Figure 1. Here, for instance, the rightmost north-south road and the bottom east-west road are not observed by any of the guards.'),
        FIG('figures/zio2011-p1-fig1.png', 'Figure 1: a 4 × 4 grid of intersections showing the initial positions of the four guards (marked G).', 'Figure 1'),
        P('We can move the guard at (3,2) down and across to (4,4) in three steps to get a solution, as shown in Figure 2.'),
        FIG('figures/zio2011-p1-fig2.png', 'Figure 2: the 4 × 4 grid after the guard at (3,2) is moved down and across to (4,4) in three steps.', 'Figure 2'),
        P('Another possibility is to move the guard at (3,3) to (3,4) and then move the guard at (3,2) to (4,3). This also takes three steps.'),
        FIG('figures/zio2011-p1-fig3.png', 'Figure 3: the 4 × 4 grid after the guard at (3,3) moves to (3,4) and the guard at (3,2) moves to (4,3).', 'Figure 3'),
        P('In each of the following cases, you are given the intial positions of the $N$ guards on an $N$ × $N$ grid of roads. You have to compute the minimum number of steps required to move the guards into new positions so that all roads are under observation. In the example above, it can be shown that the minimum number of steps required is 3.'),
      ],
    },
    4: {
      content: (b) => [
        b[0],
        MATH(
          '\\begin{array}{ccccc} b_1 & b_2 & \\cdots & b_{N-1} & b_N \\\\ b_2 & b_3 & \\cdots & b_N & b_1 \\\\ \\vdots & \\vdots & & \\vdots & \\vdots \\\\ b_{N-1} & b_N & \\cdots & b_{N-3} & b_{N-2} \\\\ b_N & b_1 & \\cdots & b_{N-2} & b_{N-1} \\end{array}',
          'Rows: b1 b2 … b(N−1) bN; b2 b3 … bN b1; … ; b(N−1) bN … b(N−3) b(N−2); bN b1 … b(N−2) b(N−1)',
        ),
        ...b.slice(2),
      ],
    },
  },
};
