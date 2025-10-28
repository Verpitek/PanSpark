import { PanSparkVM } from "./panspark";

// Example: Save and restore VM state

// Create and run a program
const vm = new PanSparkVM();

const testCode = `
SET 42 >> answer
SET 100 >> value
MATH value + 50 >> result
ECHO "Program partially executed"
`;

// Compile and run partway through
const instructions = vm.compile(testCode);
const generator = vm.run(instructions);

// Execute a few steps
for (let i = 0; i < 2; i++) {
  generator.next();
}

// Save the state at this point
const savedState = vm.saveState();
console.log("State saved!");
console.log("Saved state size:", savedState.length, "bytes");

// Create a new VM and load the saved state
const vm2 = new PanSparkVM();
vm2.loadState(savedState);

// Continue execution from where we left off
const generator2 = vm2.run(instructions);
while (generator2.next().done === false) {}

// Display output from both original and restored execution
console.log("\n=== Output from original VM ===");
for (const line of vm.buffer) {
  console.log(line);
}

console.log("\n=== Output from restored VM ===");
for (const line of vm2.buffer) {
  console.log(line);
}

console.log("\n=== Variable Memory Comparison ===");
console.log("Original VM variables:", vm.getVariableMemory());
console.log("Restored VM variables:", vm2.getVariableMemory());
