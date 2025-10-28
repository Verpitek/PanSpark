# PanSparkVM State Persistence Guide

## Overview

The PanSparkVM class now includes **complete state serialization and deserialization capabilities**. This allows you to save the entire running state of a VM to a string and later restore it to continue execution from exactly where you left off.

## New Methods

### `saveState(): string`
Saves the entire VM execution state to a JSON string.

**What gets saved:**
- All variables (global and procedure-local)
- Jump points and procedure definitions
- Current execution position (counter)
- Procedure call stack (for nested procedures)
- FOR loop stack
- Wait ticks and return values
- Output buffer
- Debug mode state
- VM UUID (for identification)

**Example:**
```typescript
const vm = new PanSparkVM();
const instructions = vm.compile(code);
const generator = vm.run(instructions);

// Execute some steps...
for (let i = 0; i < 5; i++) {
  generator.next();
}

// Save state at this point
const savedStateString = vm.saveState();
console.log("State saved as string");
```

### `loadState(serializedState: string): void`
Restores a previously saved VM state from a JSON string.

**What gets restored:**
- All variables in their exact state
- Execution position
- Call stack
- Loop stack
- All runtime state

**Example:**
```typescript
// Create a new VM
const vm2 = new PanSparkVM();

// Restore the saved state
vm2.loadState(savedStateString);

// Continue execution from where we left off
const generator2 = vm2.run(instructions);
while (generator2.next().done === false) {}
```

## Use Cases

### 1. **Checkpoint and Resume**
Save VM state at strategic points and allow users to resume execution:

```typescript
const vm = new PanSparkVM();
const instructions = vm.compile(myCode);
const gen = vm.run(instructions);

// Execute until some condition
while (shouldContinue) {
  gen.next();
}

// Save checkpoint
const checkpoint = vm.saveState();
fs.writeFileSync("checkpoint.json", checkpoint);

// Later, restore from checkpoint
const restoredState = fs.readFileSync("checkpoint.json", "utf-8");
const vm2 = new PanSparkVM();
vm2.loadState(restoredState);
const gen2 = vm2.run(instructions);
// Continue execution...
```

### 2. **State Cloning**
Create exact copies of VM state for parallel execution paths:

```typescript
const vm1 = new PanSparkVM();
const savedState = vm1.saveState();

const vm2 = new PanSparkVM();
vm2.loadState(savedState);

// vm1 and vm2 are now in identical states
// You can continue execution on either independently
```

### 3. **Debugging and Testing**
Save exact VM states for test cases or bug reproduction:

```typescript
// In production code
try {
  // ... execution ...
} catch (error) {
  // Save the exact state when error occurs
  const debugState = vm.saveState();
  console.log("State at error:", debugState);
}

// Later, in debugging
const vm = new PanSparkVM();
vm.loadState(savedDebugState);
// Reproduce the exact conditions
```

## Technical Details

### Serialization Format

The state is serialized to JSON with this structure:

```typescript
{
  uuid: string,                    // VM identifier
  counter: number,                 // Current instruction position
  waitTicks: number,              // Remaining wait cycles
  variableMemory: [               // Global variables
    [name: string, value: any],
    ...
  ],
  jumpPoints: [[string, number],   // Label -> instruction index mapping
    ...
  ],
  procPoints: [                   // Procedure -> [start, end] instruction indices
    [name: string, [start, end]],
    ...
  ],
  procStack: [                    // Nested procedure call stack
    {
      variableMemory: [...],      // Local variables for this proc
      returnLocation: number,
      returnValueTarget: string | null,
      procStartLine: number,
      procEndLine: number,
      procName: string,
      args: Variable[],
    },
    ...
  ],
  forStack: [                     // FOR loop stack
    {
      varName: string,
      endValue: number,
      forStartLine: number,
      endForLine: number,
      step: number,
    },
    ...
  ],
  procReturn: Variable,           // Return value from procedures
  shouldReturn: boolean,          // Return flag
  buffer: string[],               // Output buffer
  maxVariableCount: number | null,
  debugMode: boolean,
}
```

### Performance Considerations

- **Serialization** is O(n) where n is the number of variables and stack frames
- **String Size**: Typically 100-500 bytes for simple programs, scales with variable count
- **Deserialization** is O(n) where n is the number of variables and stack frames
- No circular references or complex object graphs, so JSON.stringify/parse is safe and efficient

### Limitations

1. **Instruction Array Not Saved**: You need to keep the compiled instructions separate. The state stores the position but not the instructions themselves.
2. **Custom OpCode State**: If you have stateful custom opcodes, they won't be automatically saved. You may need to extend these methods.
3. **Referential Integrity**: Maps are converted to arrays during serialization, so Map identity is not preserved, but functionality is identical.

## Complete Example

```typescript
import { PanSparkVM } from "./panspark";

const vm = new PanSparkVM();

const code = `
PROC fibonacci (n)
    IF n <= 1 >> fib_base_case
    SET 0 >> a
    SET 1 >> b
    SET 2 >> i
    
    POINT fib_loop
    IF i > n >> fib_done
    MATH a + b >> temp
    SET b >> a
    SET temp >> b
    MATH i + 1 >> i
    JUMP fib_loop
    
    POINT fib_done
    RETURN b
    
    POINT fib_base_case
    RETURN n
ENDPROC

SET 0 >> i
POINT loop_start
CALL fibonacci (i) >> fib_result
ECHO "Fibonacci result:"
PRINT fib_result
MATH i + 1 >> i
IF i < 10 >> loop_start

ECHO "Done!"
END
`;

// Compile once
const instructions = vm.compile(code);

// Run and save state midway
const gen = vm.run(instructions);
for (let step = 0; step < 25; step++) {
  gen.next();
}

const checkpoint = vm.saveState();
console.log("✓ Checkpoint saved");
console.log("Checkpoint size:", checkpoint.length, "bytes");

// In another context, restore and continue
const vm2 = new PanSparkVM();
vm2.loadState(checkpoint);
console.log("✓ State restored to new VM");

// Continue execution
const gen2 = vm2.run(instructions);
while (gen2.next().done === false) {}

console.log("✓ Execution completed");
console.log("\nOutput:");
for (const line of vm2.buffer) {
  console.log(" ", line);
}
```

## API Reference

### Methods

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `saveState` | `(): string` | String | Serializes VM state to JSON string |
| `loadState` | `(serializedState: string): void` | void | Restores VM state from JSON string |

### Private Helper Methods (Internal)

- `serializeVariable(variable: Variable): any` - Converts Variable to JSON-compatible format
- `deserializeVariable(data: any): Variable` - Reconstructs Variable from JSON
- `serializeVariableMap(varMap: Map<string, Variable>): Array<[string, any]>` - Converts Map to array format
- `deserializeVariableMap(data: Array<[string, any]>): Map<string, Variable>` - Reconstructs Map from array

## Error Handling

Both `saveState()` and `loadState()` can throw errors:

```typescript
try {
  const state = vm.saveState();
} catch (error) {
  console.error("Failed to save state:", error);
}

try {
  vm.loadState(invalidState);
} catch (error) {
  console.error("Failed to load state:", error.message);
  // Will show: "Failed to load VM state: [original error]"
}
```
