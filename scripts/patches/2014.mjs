import { P, TABLE } from './helpers.mjs';

const arrow = (label) => `\\xrightarrow{\\text{${label}}}`;
const route = (...steps) =>
  '$' + steps.map((s, i) => (i % 2 === 0 ? `\\text{${s}}` : arrow(s))).join(' ') + '$';

export default {
  problems: {
    2: {
      content: (b) => [
        b[0],
        TABLE(
          ['Current city', 'by bus', 'by train', 'by plane'],
          [
            ['Bangalore', 'Mumbai', 'Chennai', 'Kolkata'],
            ['Chennai', 'Bangalore', 'Bangalore', 'Mumbai'],
            ['Delhi', 'Kolkata', 'Mumbai', 'Chennai'],
            ['Kolkata', 'Delhi', 'Delhi', 'Mumbai'],
            ['Mumbai', 'Bangalore', 'Delhi', 'Bangalore'],
          ],
          'Next city, by mode of travel',
        ),
        P(
          `Suppose he starts in Chennai and travels only by plane. Then, after 5 journeys, he would be in Bangalore, having followed the route ${route('Chennai', 'plane', 'Mumbai', 'plane', 'Bangalore', 'plane', 'Kolkata', 'plane', 'Mumbai', 'plane', 'Bangalore')}.`,
        ),
        P(
          `If he starts in Delhi and travels through cycles of [train, bus, train, plane], then after 9 journeys he would be in Bangalore, having followed the route ${route('Delhi', 'train', 'Mumbai', 'bus', 'Bangalore', 'train', 'Chennai', 'plane', 'Mumbai', 'train', 'Delhi', 'bus', 'Kolkata', 'train', 'Delhi', 'plane', 'Chennai', 'train', 'Bangalore')}.`,
        ),
        P(
          `Suppose we have 12 cities numbered {0, 1, 2, . . . , 11}, with the salesman’s movements given by the table below, and the salesman travels through cycles of [bus, train, plane, plane, plane, bus, train]. (Note that some journeys take him back to the same city, such as $4 ${arrow('bus')} 4$ and $8 ${arrow('train')} 8$.)`,
        ),
        TABLE(
          ['Current city', 'by bus', 'by train', 'by plane'],
          [
            ['0', '2', '0', '7'],
            ['1', '5', '4', '10'],
            ['2', '7', '2', '0'],
            ['3', '9', '7', '2'],
            ['4', '4', '10', '5'],
            ['5', '1', '6', '6'],
            ['6', '6', '5', '1'],
            ['7', '0', '3', '8'],
            ['8', '3', '8', '11'],
            ['9', '11', '9', '3'],
            ['10', '10', '1', '4'],
            ['11', '8', '11', '9'],
          ],
          'Next city, by mode of travel',
        ),
        b[14],
      ],
    },
    3: {
      content: () => [
        P(
          'J. Bond has to break into the headquarters of an evil organization and steal important documents. The documents are in a safe that can only be opened by entering the correct code into the keypad, which is a 3 × 3 grid as shown on the right.',
        ),
        TABLE(null, [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']], 'The keypad (shown to the right of the text in the original paper)'),
        P(
          'Bond has been told that every two consecutive digits in the code will always be adjacent keys on the keypad. For example, the digit 1 will only be followed by a 2 or 4, the digit 5 will only be followed by a 2, 4, 6 or 8, and so on. So 3252 and 12369 are valid codes, but 1234 is not (3 is not adjacent to 4 on the keypad) and 55 is not (5 is not adjacent to 5 on the keypad).',
        ),
        P(
          'Bond also knows the first digit of the code and the length of the code. From this, he would like to compute the number of possible codes he has to try. For instance, if the first digit is 4 and the length of the code is 3, then there are 8 possible codes, namely {412, 414, 452, 454, 456, 458, 474, 478}.',
        ),
        P(
          'In each of the following cases, given the first digit of the code and the number of digits in the code, help Bond compute the total number of possible secret codes. Report your answer modulo 100—that is, only report the last two digits of the final answer. If the second last digit is 0, you can omit it. For instance, if the last two digits are 08, both 08 and 8 will be accepted as valid answers.',
        ),
      ],
    },
  },
};
