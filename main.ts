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
PRINT r0`;

const code4 = `
// ==========================================
// PROGRAM: Prime Factorization Calculator
// INPUT:  x0 (Number to factorize)
// OUTPUT: Prints every prime factor
// ==========================================

// --- Initialization ---
// Load input. Try changing 315 to any number (e.g., 1024, 17, 89)
SET 315 >> x0

// Move input to working register r0
SET x0 >> r0

// Start with the first prime number
SET 2 >> r1

// --- Main Loop ---
POINT loop_start

// Safety check: If r0 drops to 1, we are done
IF r0 <= 1 >> program_end

// --- Division Check ---
// Calculate Remainder: r0 % r1
MOD r0 r1 >> r2

// If remainder is 0, r1 is a factor
IF r2 == 0 >> factor_found

// --- Not a Factor ---
// If we are here, r1 did not divide r0 evenly.
// We need to check the next number.

// Optimization: Check if r1^2 > r0
// If the current divisor squared is greater than the number,
// the number remaining in r0 is prime.
MUL r1 r1 >> r3
IF r3 > r0 >> remaining_is_prime

// Increment divisor and loop back
ADD r1 1 >> r1
JUMP loop_start

// --- Factor Found Handler ---
POINT factor_found
// Output the prime factor
PRINT r1

// Divide the working number: r0 = r0 / r1
DIV r0 r1 >> r0

// Jump back to loop_start WITHOUT incrementing r1.
// We do this to catch repeated factors (e.g., 12 / 2 = 6, 6 / 2 = 3)
JUMP loop_start

// --- Remaining Prime Handler ---
POINT remaining_is_prime
// If we triggered the optimization, r0 is the last prime
PRINT r0
JUMP program_end

// --- Termination ---
POINT program_end
// Signal completion
PRINT 9999
HALT`;

// ==========================================
// TEST: SAVESTATE MECHANISM
// ==========================================
const saveStateCode = `
SET 10 >> r0
SET 20 >> r1
PRINT r0
ADD r0 5 >> r0
PRINT r0
SET 100 >> x0
PRINT r1
`;

console.log("=== SAVESTATE TEST ===");
let vm = new VM(16, 16);

// Compilation cycle
for (const instruction of vm.compile(saveStateCode)) {
  // yield during compilation
}

// Run until instruction 3 (after first PRINT)
const gen = vm.run();
let result = gen.next();
let stepCount = 0;
while (!result.done && stepCount < 2) {
  if (vm.outputBuffer[0] != undefined) {
    console.log("Output:", vm.outputBuffer);
  }
  result = gen.next();
  stepCount++;
}

// Save state at step 2
const savedState = vm.saveState();
console.log("\n--- Saved State at step 2 ---");
console.log("State string:", savedState);
console.log("Current instruction position:", vm.activeInstructionPos);
console.log("Register r0:", vm.registerMemory[0]);
console.log("Register r1:", vm.registerMemory[1]);

// Continue running with original VM
console.log("\n--- Continuing original execution ---");
while (!result.done) {
  if (vm.outputBuffer[0] != undefined) {
    console.log("Output:", vm.outputBuffer);
  }
  result = gen.next();
}

// Create new VM and restore state
console.log("\n--- Restoring from savestate (NO RECOMPILE NEEDED) ---");
let vm2 = new VM(16, 16);

// Load the saved state (includes compiled instructions)
vm2.loadState(savedState);
console.log("Restored instruction position:", vm2.activeInstructionPos);
console.log("Restored register r0:", vm2.registerMemory[0]);
console.log("Restored register r1:", vm2.registerMemory[1]);

// Continue from saved state
console.log("\n--- Continuing from restored state ---");
const gen2 = vm2.run();
let result2 = gen2.next();
while (!result2.done) {
  if (vm2.outputBuffer[0] != undefined) {
    console.log("Output:", vm2.outputBuffer);
  }
  result2 = gen2.next();
}
