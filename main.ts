import { compile, run } from './runtime';

let code: string =
`
SET 100000 >> limit
SET 2 >> current

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
JUMP next_number

POINT print_prime
PRINT current

POINT next_number
MATH current + 1 >> current
IF current <= limit >> outer_loop

PRINT "Prime calculation complete!"
`

console.time('runtime')
run(compile(code));
console.timeEnd('runtime');