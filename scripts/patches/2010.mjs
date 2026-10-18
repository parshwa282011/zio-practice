import { P, MATH } from './helpers.mjs';

export default {
  problems: {
    1: {
      content: (b) => [
        ...b.slice(0, 4),
        MATH('\\left[\\{1,2,3,4\\},\\ \\{\\},\\ \\{4\\},\\ \\{2\\},\\ \\{3,4\\},\\ \\{2,4\\},\\ \\{2,3,4\\}\\right]', '[{1, 2, 3, 4}, {}, {4}, {2}, {3, 4}, {2, 4}, {2, 3, 4}]'),
        b[6],
      ],
    },
    3: {
      content: (b) => [
        b[0],
        MATH('f(n)=\\begin{cases} 1, & \\text{if } n=4\\\\ 3f(((2n+2) \\bmod 11)-1), & \\text{otherwise}\\end{cases}', 'f(n) = 1 if n = 4; otherwise f(n) = 3 f(((2n + 2) mod 11) − 1)'),
        MATH('g(n)=y \\bmod 10,\\ \\text{where } y=\\begin{cases} 1, & \\text{if } n=0\\\\ g(n-1)+f(g(n-1))+f(n-1)+h(n-1), & \\text{otherwise}\\end{cases}', 'g(n) = y mod 10, where y = 1 if n = 0; otherwise y = g(n−1) + f(g(n−1)) + f(n−1) + h(n−1)'),
        MATH('h(n)=y \\bmod 10,\\ \\text{where } y=\\begin{cases} 1, & \\text{if } n=0\\\\ h(n-1)+g(n-1)+h(n-1)+q(f(n-1) \\bmod 10), & \\text{otherwise}\\end{cases}', 'h(n) = y mod 10, where y = 1 if n = 0; otherwise y = h(n−1) + g(n−1) + h(n−1) + q(f(n−1) mod 10)'),
        MATH('q(n)=\\begin{cases} 1, & \\text{if } n=7\\\\ f(n)+q(3n \\bmod 10), & \\text{otherwise}\\end{cases}', 'q(n) = 1 if n = 7; otherwise q(n) = f(n) + q(3n mod 10)'),
        b[19],
      ],
    },
  },
};
