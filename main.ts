import { VM } from "./panspark";

const code2 = `
POINT main
SET 1 >> r0
PRINT r0
CALL test_simple
SET 2 >> r0
PRINT r0
CALL test_recursive
SET 3 >> r0
PRINT r0
SET 999 >> r0
PRINT r0
HALT

POINT test_simple
SET 100 >> r0
PRINT r0
RET

POINT test_recursive
SET 5 >> r0
CALL countdown
SET 200 >> r0
PRINT r0
SET 300 >> r0
PRINT r0
RET

POINT countdown
PRINT r0
IF r0 == 0 >> countdown_done
DEC r0
CALL countdown
JUMP countdown_done
POINT countdown_done
RET
`;

const vm = new VM(8, 8, 8);

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

for (let i = 0; i < 10; i++) {
  if (vm.outputBuffer.length > 0) {
    console.log(vm.outputBuffer)
  }
  result = gen.next();
}
const saveState = vm.saveState();
const vm2 = new VM(8, 8, 8);
vm2.loadState(saveState);
const gen2 = vm2.run();
let result2 = gen2.next();
while (!result2.done) {
  if (vm2.outputBuffer.length > 0) {
    console.log(vm2.outputBuffer)
  }
  result2 = gen2.next();
}
const runEnd = performance.now();

console.log("Final Register State:", vm2.registerMemory);
console.log(`Runtime Execution: ${(runEnd - runStart).toFixed(4)}ms`);

