import { VM } from "./panspark";

const code2 = `INC r0
PRINT r0
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
  }
  result = gen.next();
}
const runEnd = performance.now();

console.log("Final Register State:", vm.registerMemory);
console.log(`Runtime Execution: ${(runEnd - runStart).toFixed(4)}ms`);
