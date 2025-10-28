# PanSparkVM State Persistence Guide

## Overview

The PanSparkVM class now includes **complete state serialization and deserialization capabilities**. This allows you to save the entire running state of a VM to a string and later restore it to continue execution from exactly where you left off.

The state string is **limited to 32,767 characters** to comply with standard string encoding limits. If exceeded, an error is thrown with advice on how to reduce state size.

## New Methods

### `saveState(instructions?: CompiledInstruction[]): string`
Saves the entire VM execution state to a JSON string (max 32,767 characters).

**Parameters:**
- `instructions` (optional): The compiled instructions array. If provided, they'll be saved with the state so you don't need to keep them separately.

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
- Compiled instructions (if provided)

**Throws:**
- Error if state string exceeds 32,767 characters

**Example:**
```typescript
const vm = new PanSparkVM();
const code = "SET 42 >> x\nPRINT x";
const instructions = vm.compile(code);
const generator = vm.run(instructions);

// Execute some steps...
for (let i = 0; i < 2; i++) {
  generator.next();
}

// Save state WITH instructions (can continue without keeping instructions separately)
const savedState = vm.saveState(instructions);
console.log("State saved as string:", savedState.length, "bytes");

// Save state WITHOUT instructions (lighter, but need to keep instructions)
const savedStateLight = vm.saveState();
```

### `loadState(serializedState: string): CompiledInstruction[] | null`
Restores a previously saved VM state from a JSON string.

**Parameters:**
- `serializedState`: The saved state string from `saveState()`

**Returns:**
- The compiled instructions if they were saved with the state
- `null` if instructions were not included in the state

**What gets restored:**
- All variables in their exact state
- Execution position
- Call stack
- Loop stack
- All runtime state

**Throws:**
- Error if state string exceeds 32,767 characters or is corrupted

**Example:**
```typescript
// Restore and get instructions if they were saved
const vm2 = new PanSparkVM();
const restoredInstructions = vm2.loadState(savedState);

if (restoredInstructions) {
  // Instructions were saved, continue execution
  const generator2 = vm2.run(restoredInstructions);
  while (generator2.next().done === false) {}
} else {
  // Instructions weren't saved, need to recompile or use kept reference
  const generator2 = vm2.run(instructions);
  while (generator2.next().done === false) {}
}
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

// Save checkpoint WITH instructions included
const checkpoint = vm.saveState(instructions);
fs.writeFileSync("checkpoint.json", checkpoint);

// Later, restore from checkpoint
const restoredState = fs.readFileSync("checkpoint.json", "utf-8");
const vm2 = new PanSparkVM();
const restoredInstructions = vm2.loadState(restoredState);
const gen2 = vm2.run(restoredInstructions!); // restoredInstructions is included
// Continue execution...
```

### 2. **State Cloning**
Create exact copies of VM state for parallel execution paths:

```typescript
const vm1 = new PanSparkVM();
const instructions = vm1.compile(code);
const gen1 = vm1.run(instructions);

// Run some steps
for (let i = 0; i < 10; i++) gen1.next();

// Save state WITH instructions for cloning
const savedState = vm1.saveState(instructions);

const vm2 = new PanSparkVM();
const clonedInstructions = vm2.loadState(savedState)!;

// vm1 and vm2 are now in identical states
// Continue execution on either independently
const gen2 = vm2.run(clonedInstructions);
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
  instructions: [                 // Compiled instructions (if saved)
    {
      operation: OpCode | string,
      args: string[],
      line: number,
      jumpTarget?: number,
      endForIndex?: number,
    },
    ...
  ] | null,
}
```

### Performance Considerations

- **Serialization** is O(n) where n is the number of variables and stack frames
- **String Size**: Typically 100-500 bytes for simple programs, scales with variable count
- **Deserialization** is O(n) where n is the number of variables and stack frames
- No circular references or complex object graphs, so JSON.stringify/parse is safe and efficient

### Limitations

1. **Character Limit**: State strings are limited to 32,767 characters. For large programs with many variables or output, reduce state by:
   - Clearing the buffer before saving (optional output isn't critical)
   - Saving instructions separately to reduce state size
   - Reducing variable count using the `FREE` opcode
   - Using multiple checkpoints instead of one large save

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

// Save with instructions included
const checkpoint = vm.saveState(instructions);
console.log("✓ Checkpoint saved");
console.log("Checkpoint size:", checkpoint.length, "bytes");

// In another context, restore and continue
const vm2 = new PanSparkVM();
const restoredInstructions = vm2.loadState(checkpoint);
console.log("✓ State restored to new VM");

if (!restoredInstructions) {
  throw new Error("Instructions should be included in checkpoint");
}

// Continue execution with restored instructions
const gen2 = vm2.run(restoredInstructions);
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
| `saveState` | `(instructions?: CompiledInstruction[]): string` | String | Serializes VM state to JSON string (max 32,767 chars). Optionally includes compiled instructions. |
| `loadState` | `(serializedState: string): CompiledInstruction[] \| null` | Instructions or null | Restores VM state from JSON string. Returns instructions if included in state, null otherwise. |

### Private Helper Methods (Internal)

- `serializeVariable(variable: Variable): any` - Converts Variable to JSON-compatible format
- `deserializeVariable(data: any): Variable` - Reconstructs Variable from JSON
- `serializeVariableMap(varMap: Map<string, Variable>): Array<[string, any]>` - Converts Map to array format
- `deserializeVariableMap(data: Array<[string, any]>): Map<string, Variable>` - Reconstructs Map from array

## Error Handling

Both `saveState()` and `loadState()` can throw errors:

```typescript
try {
  const state = vm.saveState(instructions);
} catch (error) {
  console.error("Failed to save state:", error.message);
  // May be: "State size (35000 characters) exceeds maximum limit of 32767 characters. 
  // Clear the output buffer, reduce variables, or use multiple checkpoints."
}

try {
  vm.loadState(invalidState);
} catch (error) {
  console.error("Failed to load state:", error.message);
  // May be: "Failed to load VM state: [original error]"
  // Or: "Serialized state (40000 characters) exceeds maximum limit of 32767 characters"
}
```

## Size Reduction Tips

If your state exceeds 32,767 characters:

1. **Clear the output buffer before saving** (if output isn't critical):
   ```typescript
   vm.buffer = [];
   const state = vm.saveState(instructions);
   ```

2. **Save instructions separately** (reduces state by ~50% for large programs):
   ```typescript
   const state = vm.saveState(); // No instructions
   const instString = JSON.stringify(instructions);
   ```

3. **Free unused variables**:
   ```typescript
   vm.run(vm.compile("FREE unused_var_name\nFREE another_var"));
   const state = vm.saveState(instructions);
   ```

4. **Use multiple checkpoints** instead of one large save:
   ```typescript
   // Save every N steps instead of one big checkpoint
   for (let i = 0; i < 1000; i++) {
     gen.next();
     if (i % 100 === 0) {
       checkpoints.push(vm.saveState()); // Smaller, more frequent saves
     }
   }
   ```
