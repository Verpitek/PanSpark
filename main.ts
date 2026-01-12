import { VM } from "./panspark";

const code2 = `SET 0 >> r0
POINT loop
INC r0
PRINT r0
RNG 0 1000 >> r1
PRINT r1
IF r0 < 200000 >> loop

`;

const vm = new VM(8, 8);

// --- Compile Benchmark ---
const compileStart = performance.now();
const instructions = Array.from(vm.compile(code2)); 
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
   console.log(vm.outputBuffer); 
  }
  result = gen.next();
}
const runEnd = performance.now();

console.log("Final Register State:", vm.registerMemory);
console.log(`Runtime Execution: ${(runEnd - runStart).toFixed(4)}ms`);