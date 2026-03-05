import { VM } from "./panspark";

// Example code demonstrating new IF block syntax
const code = `
// Simple IF without ELSE
SET 10 >> r0
IF r0 > 5
    PRINT "r0 is greater than 5"
END

// IF with ELSE
SET 3 >> r1
IF r1 > 5
    PRINT "r1 is greater than 5"
ELSE
    PRINT "r1 is not greater than 5"
END

// Nested IF blocks
SET 7 >> r2
IF r2 > 0
    PRINT "r2 is positive"
    IF r2 < 10
        PRINT "r2 is between 0 and 10"
    END
END

// String comparison
SET "hello" >> r3
IF r3 == "hello"
    PRINT "String matches!"
ELSE
    PRINT "String does not match"
END
`;

const vm = new VM(16, 16, 128, 1280, 16);

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
const compileEnd = performance.now();
console.log(`Compilation Time: ${(compileEnd - compileStart).toFixed(4)}ms`);
console.log(`Total Instructions: ${instructions.length}`);

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
console.log(`Runtime: ${(runEnd - runStart).toFixed(4)}ms`);