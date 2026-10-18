import { P, OL, TABLE } from './helpers.mjs';

const part = (label, prompt) => ({ label, prompt });

export default {
  problems: {
    2: { parts: () => [part('', 'What property do all the good numbers share?')] },
    3: {
      content: (b) => [
        b[0],
        b[1],
        b[2],
        OL(
          'Take plate 1 from Atul and start a stack on the table.',
          'Pass plate 2 directly from Atul to Zenobia.',
          'Take plate 3 from Atul and stack it on top of plate 1.',
          'Pass plate 4 directly from Atul to Zenobia.',
          'Take plate 3 off the stack and pass it to Zenobia.',
          'Take plate 1 off the stack and pass it to Zenobia.',
        ),
        b[4],
        P('Consider the following input and output sequences of plates.'),
        TABLE(
          ['Input sequences', 'Output sequences'],
          [
            ['(1) 5,8,10,3,2,9,7,6,4,1', '(A) 6,2,7,4,5,8,3,10,9,4'],
            ['(2) 10,1,9,6,5,4,2,8,3,7', '(B) 3,9,7,2,10,6,1,4,8,5'],
            ['(3) 7,6,2,5,3,4,8,10,4,9', '(C) 9,5,6,1,2,4,10,7,3,8'],
          ],
        ),
        b[9],
      ],
      parts: () => [part('', 'List the compatible (input, output) pairs.')],
    },
    4: {
      content: (b) => [
        b[0],
        b[1],
        b[2],
        P('If the thief fills his sack with all 18 kg of turmeric and 2 kg of mustard, he will walk away with spices worth Rs 2400 + $\\frac{2}{15} \\times 1800$ = Rs 2400 + 240 = Rs 2640.'),
        b[4],
      ],
    },
    5: { parts: () => [part('a', 'Komal (starting at K)'), part('b', 'Narain (starting at N)'), part('c', 'Robert (starting at R)')] },
  },
};
