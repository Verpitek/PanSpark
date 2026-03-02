import { VM } from "./panspark";

const code = `
  PRINT "kebabas"
`;

const vm = new VM(16, 16, 128, 1280);

vm.registerPeripheral("MATH_FAC", (vm, args) => {
  const n = vm.fetchMemory(args[0]);
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
    console.log(vm.outputBuffer);
  }
  result = gen.next();
}
