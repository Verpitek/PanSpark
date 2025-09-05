import { compile, run } from './runtime';

let code: string =
`
SIGNAL 0  // Program started
SET 100000 >> limit
SET 2 >> current
SIGNAL 1  // Prime calculation initialized

POINT outer_loop
SET 1 >> is_prime
SET 2 >> divisor

POINT inner_loop
MATH current % divisor >> remainder

IF remainder == 0 >> not_prime
MATH divisor + 1 >> divisor
IF divisor < current >> inner_loop

IF is_prime == 1 >> print_prime
POINT not_prime
JUMP next_number // this is a jump point, im testing comments

POINT print_prime
PRINT current  // Print the prime number itself

POINT next_number
MATH current + 1 >> current
IF current <= limit >> outer_loop

SIGNAL 999  // Prime calculation complete
`

console.time('runtime')
run(compile(code));
console.timeEnd('runtime');