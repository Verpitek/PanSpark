import { VM } from "./panspark";

const code2 = `
// ==========================================
// TEST 1: ARITHMETIC & REGISTERS
// ==========================================
SET 10 >> r0
ADD r0 5 >> r0
PRINT r0

// ==========================================
// TEST 2: FORWARD JUMP (Skipping Code)
// ==========================================
PRINT 1111
JUMP skip_bad_code
PRINT 9999
POINT skip_bad_code
PRINT 2222

// ==========================================
// TEST 3: BACKWARD JUMP (Looping)
// ==========================================
// Goal: Count down 3, 2, 1
SET 3 >> r1

POINT loop_start
PRINT r1
SUB r1 1 >> r1
IF r1 > 0 >> loop_start

PRINT 3333

// ==========================================
// TEST 4: COMPLEX CONDITION
// ==========================================
SET 50 >> r2
SET 50 >> r3
IF r2 == r3 >> math_check
PRINT 8888
POINT math_check
PRINT 4444
`;

const code3 = `
SET 0 >> r0
POINT loop
ADD r0 1 >> r0
PRINT r0
JUMP loop`;

// create a new VM with memory bounds for register and machine memory
let vm = new VM(16, 16);

// compilation cycle
for (const instruction of vm.compile(code2)) {
  console.log(instruction)
}

// running cycle
const gen = vm.run();
let result = gen.next();
while (!result.done) {
  if (vm.outputBuffer[0] != undefined) {
    console.log(vm.outputBuffer);
  }
  result = gen.next();
}
