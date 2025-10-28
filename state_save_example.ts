import { PanSparkVM } from "./panspark";

/**
 * Complete example of VM state persistence with instructions
 * Demonstrates:
 * - Saving state with compiled instructions embedded
 * - Restoring and continuing execution
 * - Handling the 32,767 character limit
 */

const vm = new PanSparkVM();

const code = `
PROC factorial (n)
    SET 1 >> result
    POINT factorial_loop
    IF n <= 1 >> end_factorial_loop
    MATH result * n >> result
    MATH n - 1 >> n
    JUMP factorial_loop
    POINT end_factorial_loop
    RETURN result
ENDPROC

SET 0 >> i
POINT loop_start
CALL factorial (i) >> fact_result
ECHO "Factorial calculated"
PRINT fact_result
MATH i + 1 >> i
IF i < 5 >> loop_start

ECHO "Done!"
END
`;

// Step 1: Compile the code
const instructions = vm.compile(code);
console.log("✓ Code compiled, instructions:", instructions.length);

// Step 2: Run partway and save
const gen = vm.run(instructions);

// Execute a few steps
for (let step = 0; step < 15; step++) {
  gen.next();
}

console.log("✓ Executed 15 steps");
console.log("  Variables:", vm.getVariableMemory().size);
console.log("  Buffer lines:", vm.buffer.length);
console.log("  Counter position:", vm.counter);

// Step 3: Save state WITH instructions included
try {
  const savedState = vm.saveState(instructions);
  console.log("\n✓ State saved!");
  console.log("  Size:", savedState.length, "/ 32767 characters");
  console.log("  Overhead for instructions:", 
    (savedState.length - vm.saveState().length), "bytes");

  // Step 4: Create new VM and restore
  const vm2 = new PanSparkVM();
  const restoredInstructions = vm2.loadState(savedState);

  if (!restoredInstructions) {
    throw new Error("Instructions should have been restored!");
  }

  console.log("\n✓ State restored to new VM!");
  console.log("  Counter restored to:", vm2.counter);
  console.log("  Variables restored:", vm2.getVariableMemory().size);

  // Step 5: Continue execution from restored state
  const gen2 = vm2.run(restoredInstructions);
  while (gen2.next().done === false) {}

  console.log("\n✓ Execution completed from restored state!");
  console.log("  Final counter:", vm2.counter);
  console.log("  Final variables:", vm2.getVariableMemory().size);
  console.log("  Buffer lines:", vm2.buffer.length);

  // Show final output
  console.log("\n=== Program Output ===");
  for (const line of vm2.buffer) {
    console.log(" ", line);
  }

} catch (error: any) {
  console.error("✗ Error:", error.message);
  if (error.message.includes("exceeds maximum limit")) {
    console.log("\nTip: To reduce state size:");
    console.log("  - Clear buffer: vm.buffer = []");
    console.log("  - Free unused vars: FREE unused_var");
    console.log("  - Save without instructions: vm.saveState()");
  }
}
