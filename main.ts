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

const code3 = `
SET 32767 >> r0
PRINT r0`;

const vm = new VM(16, 16, 256, 1024);

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
    console.log(vm.outputBuffer);
  }
  result = gen.next();
}

// Test RAM save/load
console.log("\n=== Testing RAM Save/Load ===");
// Write some test values to RAM
vm.ram[0] = 123;
vm.ram[1] = 456;
vm.ram[10] = 789;
vm.ram[100] = 999;
console.log("Original RAM values:");
console.log("RAM[0] =", vm.ram[0]);
console.log("RAM[1] =", vm.ram[1]);
console.log("RAM[10] =", vm.ram[10]);
console.log("RAM[100] =", vm.ram[100]);

const saveState = vm.saveState();
console.log("\nSaveState string (first 200 chars):", saveState.substring(0, 200) + "...");
const vm2 = new VM(16, 16, 256, 1024);
vm2.loadState(saveState);

// Verify RAM was restored
console.log("\nRestored RAM values:");
console.log("RAM[0] =", vm2.ram[0]);
console.log("RAM[1] =", vm2.ram[1]);
console.log("RAM[10] =", vm2.ram[10]);
console.log("RAM[100] =", vm2.ram[100]);

// Verify RAM matches original
const ramMatch = vm2.ram[0] === 123 && vm2.ram[1] === 456 && vm2.ram[10] === 789 && vm2.ram[100] === 999;
console.log("RAM restoration successful:", ramMatch);

const gen2 = vm2.run();
let result2 = gen2.next();
while (!result2.done) {
  if (vm2.outputBuffer.length > 0) {
    console.log(vm2.outputBuffer);
  }
  result2 = gen2.next();
}
const runEnd = performance.now();

console.log("Final Register State:", vm2.registerMemory);
console.log(`Runtime Execution: ${(runEnd - runStart).toFixed(4)}ms`);
