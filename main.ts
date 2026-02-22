import { VM } from "./panspark";

// custom periferal
import { registerArrayLib } from "./peripherals/array";

const code = `
$counter = r0
$limit = r1
// automatic assigning or registers
$list = auto

ARR_NEW >> $list
PRINT $list
ARR_PUSH $list "iron_ore"
ARR_PUSH $list "gold_ore"

ARR_GET $list 1 >> r3
PRINT r3

SET 10 >> $limit

POINT loop
PRINT $counter
INC $counter
IF $limit > $counter >> loop
`;

const vm = new VM(8, 8, 1280);
registerArrayLib(vm);


vm.registerPeripheral("MATH_FAC", (vm, args) => {
  const n      = vm.fetchMemory(args[0]);
  const result = args[1];
  let acc = 1;
  for (let i = 2; i <= n; i++) acc *= i;
  vm.setMemory(acc, result);
});

// --- Compile Benchmark ---
const compileStart = performance.now();
const instructions = Array.from(vm.compile(code));
console.log(instructions);
const compileEnd = performance.now();

console.log(`Compilation Time: ${(compileEnd - compileStart).toFixed(4)}ms`);

for (const instruction of instructions) {
}

// --- Runtime Benchmark ---
const runStart = performance.now();
const gen = vm.run();
let result = gen.next();

while (!result.done) {
  if (vm.outputBuffer.length > 0) {
    console.log(vm.outputBuffer)
  }
  result = gen.next();
}