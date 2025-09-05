import { run } from './runtime';

let code: string =
`
SET 10 >> num1
SET 20 >> num2
set 0 >> result

MATH num1 + num2 >> result
if result > 5 >> thingy
POINT thingy
PRINT result`

console.time('runtime')
run(code);
console.timeEnd('runtime');