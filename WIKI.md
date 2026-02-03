# PanSpark Language Guide

PanSpark is a low-level 16bit, assembly-like language designed for a custom virtual machine. It supports registers, direct memory access, stack-based recursion, and event-based blocking.

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Memory Model](#memory-model)
3. [Syntax Rules](#syntax-rules)
4. [Operation Reference](#operation-reference)
5. [Control Flow & Functions](#control-flow--functions)
6. [Examples](#examples)

---

## Core Concepts

PanSpark executes instructions line-by-line. Each line contains a single operation.
* **Registers:** Fast, temporary storage for calculations.
* **Machine Memory:** Storage for persistent data or hardware I/O.
* **Labels:** Named markers for jumps and function calls.

## Memory Model

The VM provides two types of storage. While functionally identical in speed, they have semantic differences:

| Type | Prefix | Range | Description |
| :--- | :--- | :--- | :--- |
| **Registers** | `r` | `r0`–`r7` | General-purpose. Used for math, loop counters, and active computation. |
| **Memory** | `x` | `x0`–`x7` | Machine state. Used for I/O. |

---

## Syntax Rules

1.  **Assignment (`>>`):** Operations that produce a value use `>>` to point to the destination.
    * *Correct:* `SET 10 >> r0`
    * *Incorrect:* `SET 10 r0`
2.  **Comments:** Must be on their own line, starting with `//`. Inline comments are not supported.
3.  **Case Sensitivity:** OpCodes are strictly **UPPERCASE** (e.g., `SET`, `PRINT`).
4.  **Whitespace:** Arguments must be separated by spaces.
5.  **Labels:** Used for flow control. Do not use numbers as labels.

---

## Operation Reference

### Basic Operations

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **SET** | `SET <val> >> <dest>` | Stores a value (literal or register) into a destination. |
| **PRINT** | `PRINT <val>` | Outputs the value to the console buffer. |
| **NOP** | `NOP` | No Operation. Does nothing. |
| **HALT** | `HALT` | Immediately stops program execution. |

### Arithmetic & Logic
All arithmetic operations store the result in the `<dest>` register/memory.

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **ADD** | `ADD a b >> dest` | `dest = a + b` |
| **SUB** | `SUB a b >> dest` | `dest = a - b` |
| **MUL** | `MUL a b >> dest` | `dest = a * b` |
| **DIV** | `DIV a b >> dest` | `dest = a / b` |
| **MOD** | `MOD a b >> dest` | `dest = a % b` |
| **POW** | `POW b e >> dest` | `dest = b ^ e` |
| **SQRT** | `SQRT a >> dest` | `dest = √a` |
| **ABS** | `ABS a >> dest` | `dest = \|a\|` |
| **MIN** | `MIN a b >> dest` | Stores the smaller of the two values. |
| **MAX** | `MAX a b >> dest` | Stores the larger of the two values. |
| **RNG** | `RNG min max >> dest`| Generates a random integer between min and max. |

### Shortcuts

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **INC** | `INC <reg>` | Increments the register by 1 (in-place). |
| **DEC** | `DEC <reg>` | Decrements the register by 1 (in-place). |

---

## Control Flow & Functions

### Jumps
Unconditional movement of the instruction pointer.
* **Syntax:** `JUMP <label>`
* *Note:* Do **not** use `>>`.

### Conditional Jumps (IF)
Jumps to a label only if the condition is **TRUE**.
* **Syntax:** `IF <val1> <op> <val2> >> <label>`
* **Operators:** `==`, `!=`, `<`, `>`, `<=`, `>=`
* *Note:* Requires `>>` before the label.

### Blocking Wait (UNTIL)
Pauses execution completely until the condition becomes **TRUE**. Used for waiting on external events or hardware changes.
* **Syntax:** `UNTIL <val1> <op> <val2>`
* *Note:* No label or jump involved. The VM yields until the condition is met.

### Functions (Call Stack)
Standard stack-based recursion.
* **CALL:** `CALL <label>`
    * Pushes the *next* line number to the stack and jumps to `<label>`.
* **RET:** `RET`
    * Pops the return address from the stack and jumps back.

---

## Examples

### 1. The "Wait for Input" Pattern (UNTIL)
```arm
// Assume x0 is connected to a button (0 = off, 1 = on)

POINT wait_for_press
  // The VM will freeze here until x0 becomes 1
  UNTIL x0 == 1
  
  PRINT 123
  
  // Wait for button release before continuing
  UNTIL x0 == 0
  
  JUMP wait_for_press
```
### 2. Recursive Factorial (CALL/RET)
```arm
POINT main
  SET 5 >> r0      
  SET 1 >> r1
  CALL factorial
  PRINT r1
  HALT

POINT factorial
  // Base case: If r0 is 0, return
  IF r0 == 0 >> done
  
  // Recursive step
  MUL r1 r0 >> r1
  DEC r0
  CALL factorial
  
POINT done
  RET
```
### 3. Simple Loop (IF)
```arm
SET 10 >> r0

POINT loop
  PRINT r0
  DEC r0
  
  // Jump back if r0 is still > 0
  IF r0 > 0 >> loop
  
  PRINT 999
  HALT
```

---

## VM API Reference

The PanSpark VM provides a TypeScript/JavaScript API for programmatic control.

### Initialization
```typescript
import { VM } from "./panspark";

// Parameters: registers, machine memory, call stack depth, RAM size
const vm = new VM(16, 16, 256, 1024);
```

### Core Methods
- `compile(code: string): Generator<Instruction>` - Compiles PanSpark source code
- `run(): Generator<void>` - Executes compiled instructions (yields after each)
- `saveState(): string` - Serializes complete VM state
- `loadState(state: string): void` - Restores VM from serialized state

### State Persistence
The VM can save and restore its complete state including:
- Instruction pointer position
- Register values (`r0`-`rN`)
- Machine memory values (`x0`-`xN`)
- Call stack contents
- Output buffer
- RAM contents
- Compiled instructions

```typescript
// Save current execution state
const saved = vm.saveState();

// Restore in a new VM instance
const vm2 = new VM(16, 16, 256, 1024);
vm2.loadState(saved);
// Continue execution from saved point
```

### Direct Memory Access
```typescript
// Access RAM directly (Int16Array)
vm.ram[0] = 123;
const value = vm.ram[1];

// Access registers and machine memory via API
vm.setMemory(67, { type: ArgType.REGISTER, value: 0 }); // r0 = 67
const regValue = vm.fetchMemory({ type: ArgType.REGISTER, value: 0 });
```

### Execution Control
```typescript
// Step-through execution
const gen = vm.run();
while (!gen.next().done) {
  // Check for output each step
  if (vm.outputBuffer.length > 0) {
    console.log("Output:", vm.outputBuffer);
  }
}

// Fast execution (no yielding)
vm.runFastFlag = true;
vm.run(); // Runs to completion
```

### Enums and Types
- `OpCode`: All supported operations (SET, ADD, SUB, etc.)
- `ArgType`: Argument types (LITERAL, REGISTER, MEMORY, etc.)
- `Instruction`: Compiled instruction structure
- `Argument`: Single argument with type and value