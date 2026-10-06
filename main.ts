import { VM } from "./panspark";

const code = `
$sum     = r0
$counter = r1
$fac     = r2
$n       = r3
$result  = r4

POINT main
  SET 0 >> $sum
  SET 10 >> $counter

POINT loop
  ADD $sum $counter >> $sum
  DEC $counter
  IF $counter > 0 >> loop

  PRINT "sum 1..10:"
  PRINT $sum

  SET 5 >> $n
  SET 1 >> $fac
  CALL factorial
  PRINT "5! :"
  PRINT $fac

  SET 7 >> $n
  MATH_FAC $n >> $result
  PRINT "MATH_FAC 7:"
  PRINT $result
  HALT

POINT factorial
  IF $n == 0 >> done
  MUL $fac $n >> $fac
  DEC $n
  CALL factorial

POINT done
  RET
`;

const vm = new VM(16, 128, 1280);

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
