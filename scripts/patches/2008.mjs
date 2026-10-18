import { P, L, PRE, TABLE } from './helpers.mjs';

export default {
  problems: {
    1: {
      content: (b) => [
        ...b.slice(0, 2),
        P('We define GrayCode(n) inductively, as follows:'),
        L(
          'GrayCode(1) = [0, 1] — that is, 0 in binary encodes the integer 0, and 1 in binary encodes the integer 1.',
          'Assuming that we have built up GrayCode(n) to denote integers between 0 and $2^{n}$ − 1, we define GrayCode(n+1) as follows:',
        ),
        P('(a) Prefix each binary number in GrayCode(n) by 0. This generates the first half of GrayCode(n+1).'),
        P('(b) Reverse the list GrayCode(n) and prefix each number in the reversed list by 1. This generates the second half of GrayCode(n+1).'),
        P('For instance,'),
        PRE(
          [
            'GrayCode(1) = [0, 1]',
            'GrayCode(2) = 0.GrayCode(1) followed by 1.(reverse(GrayCode(1)))',
            '            = 0.[0,1] followed by 1.[1,0]',
            '            = [00,01] followed by [11,10]',
            '            = [00,01,11,10]',
            'GrayCode(3) = 0.[00,01,11,10] followed by 1.[10,11,01,00]',
            '            = [000,001,011,010,110,111,101,100]',
          ].join('\n'),
        ),
        b[13],
        b[14],
      ],
    },
    2: {
      content: (b) => [
        ...b.slice(0, 3),
        P('In each of the cases below, you are given the constraints for the courses Anjali plans to take. The courses are numbered 1,2,. . . ,10. In each case, you have to compute the minimum number of semesters she needs to complete these courses, given the constraints.'),
      ],
    },
    3: {
      content: (b) => [
        ...b.slice(0, 2),
        TABLE(
          ['Board 1 hangs between', 'Board 2 hangs between'],
          [
            ['Poles 1 and 2', 'Poles 3 and 4'],
            ['Poles 1 and 2', 'Poles 3 and 5'],
            ['Poles 1 and 2', 'Poles 4 and 5'],
            ['Poles 1 and 3', 'Poles 4 and 5'],
            ['Poles 2 and 3', 'Poles 4 and 5'],
          ],
        ),
        ...b.slice(9),
      ],
    },
  },
};
