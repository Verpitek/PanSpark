# PanSpark Language Guide

PanSpark is a low-level, assembly-like language designed for a custom virtual machine built for LunaTech. It supports a single register bank, a shared heap budget, stack-based recursion, event-based blocking, named variable declarations, and user-defined peripheral opcodes.

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Memory Model](#memory-model)
3. [Heap Budget](#heap-budget)
4. [Named Variables](#named-variables)
5. [Syntax Rules](#syntax-rules)
6. [Operation Reference](#operation-reference)
7. [Control Flow & Functions](#control-flow--functions)
8. [Custom OpCodes (Peripherals)](#custom-opcodes-peripherals)
9. [State Persistence](#state-persistence)
10. [Examples](#examples)
11. [VM API Reference](#vm-api-reference)

---

## Core Concepts

PanSpark executes instructions line-by-line. Each line contains a single operation.

- **Registers (`r0`–`rN`):** General-purpose storage. Math, counters, temporaries, function arguments. Each register holds an integer or a string.
- **Heap:** Shared byte budget across all registers.
- **Labels:** Named markers for jumps and function calls.
- **Peripherals:** Custom opcodes registered at the host level for hardware interaction.
- **Named Variables:** `$name` aliases resolved at compile time — no runtime cost.

---

## Memory Model

PanSpark has a single bank of registers. Every register can hold either an integer or a string; the type is stored per write.

| Type | Prefix | Range | Description |
| :--- | :--- | :--- | :--- |
| **Registers** | `r` | `r0`–`rN` | General purpose. Local variables, counters, temporaries, recursive arguments. |

```arm
SET 42 >> r0            // store integer
SET "luna" >> r1        // store string
SET r0 >> r2            // copy register
ADD r0 r2 >> r3         // arithmetic
IF r0 == 42 >> label    // comparison
```

---

## Heap Budget

All registers share a single byte pool. The VM checks the budget on every write.

| Value Type | Byte Cost |
| :--- | :--- |
| Integer | 2 bytes |
| String | `string.length + 1` bytes |

```typescript
// 8 registers, all start as 2-byte integers
// heapLimit 1280 → 1280 - (8 × 2) = 1264 bytes free for strings
const vm = new VM(8, 256, 1280);
```

Writing a new value into a register frees the old value's cost and charges the new one. Exceeding the limit throws a heap overflow — the write is rejected and the register is unchanged.

---

## Named Variables

`$name` declarations are resolved by the compiler as its first pass, before anything else runs. There is no separate precompile step — just pass your source to `compile()` as normal.

### Syntax

```arm
$name = r2     // explicit: bind $name to register r2
$name = auto   // auto: assign next available register
```

- Declaration lines are stripped from the compiled output.
- `auto` tracks the highest explicitly claimed register index to avoid collisions.
- Explicit and `auto` declarations can coexist freely.
- Names are substituted longest-first to prevent partial-match bugs (`$foobar` before `$foo`).
- Only `r`-registers may be declared; any other target throws at compile time.

### Example

```arm
$index  = auto       // → r0 (first free register)
$count  = auto       // → r1
$total  = r2         // explicit

POINT main
  SET 0 >> $index
  SET 10 >> $count
  SET 0 >> $total

POINT loop
  IF $index >= $count >> done
  ADD $total $index >> $total
  INC $index
  JUMP loop

POINT done
  PRINT $total
  HALT
```

After variable resolution, the compiler sees plain `r0`, `r1`, `r2` — identical to writing them by hand.

---

## Syntax Rules

1. **Assignment (`>>`):** Operations that produce a value use `>>` to point to the destination register.
   - Correct: `ADD r0 r1 >> r2`
   - Incorrect: `ADD r0 r1 r2`
2. **Comments:** Own line only, starting with `//`. Inline comments not supported.
3. **Case Sensitivity:** OpCodes strictly **UPPERCASE**. Register names lowercase (`r0`, `r3`).
4. **Whitespace:** Arguments separated by single spaces.
5. **Labels:** Named markers used with `POINT`. Do not use numbers as label names.
6. **String Literals:** Enclosed in double quotes — `SET "iron_ore" >> r0`.
7. **Variable Declarations:** `$name = r0` or `$name = auto`. Placed before first use (top of file by convention).

---

## Operation Reference

### Control Flow

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **JUMP** | `JUMP <label>` | Unconditional jump to label |
| **POINT** | `POINT <label>` | Declares a jump/call target |
| **IF** | `IF v1 op v2 >> label [ELSE label]` | Conditional jump based on comparison |
| **UNTIL** | `UNTIL v1 op v2` | Blocks execution until condition becomes true |
| **CALL** | `CALL <label>` | Push return address, jump to label |
| **RET** | `RET` | Pop return address, jump back |

### Basic Operations

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **SET** | `SET <val> >> <dest>` | Stores a value into a register. `val` can be a literal, string, or register. |
| **PRINT** | `PRINT <val>` | Pushes the value to the output buffer. |
| **NOP** | `NOP` | No Operation. |
| **HALT** | `HALT` | Immediately stops execution. |

### Arithmetic & Logic

All arithmetic operations are **integer-only**. Passing a string register throws at runtime.

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **ADD** | `ADD a b >> dest` | `dest = a + b` |
| **SUB** | `SUB a b >> dest` | `dest = a - b` |
| **MUL** | `MUL a b >> dest` | `dest = a * b` |
| **DIV** | `DIV a b >> dest` | `dest = trunc(a / b)` — throws on zero |
| **MOD** | `MOD a b >> dest` | `dest = a % b` — throws on zero |
| **POW** | `POW b e >> dest` | `dest = b ^ e` |
| **SQRT** | `SQRT a >> dest` | `dest = floor(√a)` |
| **ABS** | `ABS a >> dest` | `dest = \|a\|` |
| **MIN** | `MIN a b >> dest` | Stores the smaller of two values |
| **MAX** | `MAX a b >> dest` | Stores the larger of two values |
| **RNG** | `RNG min max >> dest` | Random integer in `[min, max]` inclusive |

### Shortcuts

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **INC** | `INC <reg>` | Increments register in-place |
| **DEC** | `DEC <reg>` | Decrements register in-place |

---

## Control Flow & Functions

### Jumps

```
JUMP <label>
```

### Conditional Jumps (IF)

```
IF <val1> <op> <val2> >> <label_true>
IF <val1> <op> <val2> >> <label_true> ELSE <label_false>
```

**Operators:** `==`, `!=`, `<`, `>`, `<=`, `>=`

- `==` and `!=` work on integers and strings (content comparison).
- `<`, `>`, `<=`, `>=` work on integers only — passing a string throws.
- Any register can appear on either side, and literals are allowed.

If the condition is true, execution jumps to `label_true`. If the condition is false and an `ELSE` clause is provided, execution jumps to `label_false`; otherwise execution falls through to the next instruction.

### Blocking Wait (UNTIL)

```
UNTIL <val1> <op> <val2>
```

Stays on this instruction, yielding each cycle, until the condition becomes true. The intended use is waiting on a register to be updated by a peripheral or external host code.

```arm
// Wait until a machine's progress register hits 100
UNTIL r0 == 100
PRINT "done"
HALT
```

### Functions (Call Stack)

```
CALL <label>   // push return address, jump to label
RET            // pop return address, jump back
```

Full recursion supported up to the configured call stack depth.

---

## Custom OpCodes (Peripherals)

Any opcode not in the core set dispatches to a registered peripheral handler. Register handlers on the host before compiling. Handlers receive the full `vm` instance and can freely read and write registers.

```typescript
vm.registerPeripheral("SENSOR_READ", (vm, args) => {
  const value = sensor.poll();
  vm.setMemory(value, args[0]);
});

vm.registerPeripheral("MATH_FAC", (vm, args) => {
  const n = vm.fetchMemory(args[0]);
  let acc = 1;
  for (let i = 2; i <= n; i++) acc *= i;
  vm.setMemory(acc, args[1]);
});
```

```arm
SENSOR_READ >> r0
PRINT r0

SET 7 >> r1
MATH_FAC r1 >> r2
PRINT r2
HALT
```

**Peripheral names survive serialization** — stored on each compiled instruction. Handler *functions* do not — re-register them after `loadState()`.

---

## State Persistence

Complete VM state serializes to a plain string and restores on any VM instance with the same configuration.

```typescript
const snapshot = vm.saveState();

const vm2 = new VM(8, 256, 1280);
vm2.registerPeripheral("SENSOR_READ", ...);
vm2.loadState(snapshot);

for (const _ of vm2.run()) {}
```

**What survives:**
- Instruction pointer
- All register values (integers and strings)
- Call stack
- Output buffer
- Compiled instructions (including peripheral names)

**What does not survive:**
- Peripheral handler functions — they are code, not data

---

## Examples

### 1. Wait for Input (UNTIL)

```arm
// Peripheral writes 1 to r0 when a button is pressed, 0 on release
POINT wait_for_press
  UNTIL r0 == 1
  PRINT "pressed"
  UNTIL r0 == 0
  PRINT "released"
  JUMP wait_for_press
```

### 2. Recursive Factorial

```arm
$n   = r0
$acc = r1

POINT main
  SET 5 >> $n
  SET 1 >> $acc
  CALL factorial
  PRINT $acc
  HALT

POINT factorial
  IF $n == 0 >> done
  MUL $acc $n >> $acc
  DEC $n
  CALL factorial

POINT done
  RET
```

### 3. IF / ELSE Dispatch

```arm
$score = r0

SET 85 >> $score

IF $score >= 90 >> grade_a
IF $score >= 80 >> grade_b
IF $score >= 70 >> grade_c
PRINT "F"
HALT

POINT grade_a
PRINT "A"
HALT

POINT grade_b
PRINT "B"
HALT

POINT grade_c
PRINT "C"
HALT
```

### 4. Simple Loop

```arm
$counter = auto

SET 10 >> $counter

POINT loop
  PRINT $counter
  DEC $counter
  IF $counter > 0 >> loop

PRINT 999
HALT
```

### 5. Custom OpCode Factorial

```typescript
vm.registerPeripheral("MATH_FAC", (vm, args) => {
  const n = vm.fetchMemory(args[0]);
  let acc = 1;
  for (let i = 2; i <= n; i++) acc *= i;
  vm.setMemory(acc, args[1]);
});
```

```arm
$n      = auto
$result = auto

SET 7 >> $n
MATH_FAC $n >> $result
PRINT $result
HALT
```

---

## VM API Reference

### Initialization

```typescript
import { VM } from "./panspark";

// register count, call stack depth, heap limit (bytes)
const vm = new VM(8, 256, 1280);
```

### Core Methods

| Method | Returns | Description |
| :--- | :--- | :--- |
| `compile(source)` | `Generator<Instruction>` | Resolves `$vars`, strips comments, compiles to instructions (generator — iterate to consume) |
| `run()` | `Generator<void>` | Executes instructions, yields after each step |
| `saveState()` | `string` | Serializes full VM state |
| `loadState(state)` | `void` | Restores VM from serialized state |
| `registerPeripheral(name, fn)` | `void` | Registers a custom opcode handler |
| `unregisterPeripheral(name)` | `void` | Removes a custom opcode handler |
| `setMemory(data, dest)` | `void` | Writes a `number \| string` to a register |
| `fetchMemory(arg)` | `number` | Reads a number — throws if the register holds a string |
| `fetchValue(arg)` | `number \| string` | Reads any value type from a register |
| `heapAvailable()` | `number` | Remaining heap bytes |
| `heapUsed()` | `number` | Consumed heap bytes |
| `pushCallStack(addr)` | `void` | Pushes a return address onto the call stack (throws on overflow) |
| `popCallStack()` | `number` | Pops and returns a return address (throws on underflow) |

### Public Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `registerMemory` | `RegValue[]` | Register values |
| `registerMemoryLimit` | `number` | Number of registers |
| `callStackLimit` | `number` | Max call stack depth |
| `heapLimit` | `number` | Total heap budget in bytes |
| `runFastFlag` | `boolean` | When `true`, `run()` skips per-instruction yields and keeps output buffer (batch mode) |
| `activeInstructionPos` | `number` | Current instruction pointer |
| `stackPointer` | `number` | Current call stack depth |
| `outputBuffer` | `RegValue[]` | Cleared each step; holds `PRINT` output |
| `instructions` | `Instruction[]` | Compiled instruction list |
| `callStack` | `Int16Array` | The raw call stack array |

### Enums and Types

| Name | Description |
| :--- | :--- |
| `OpCode` | All built-in operations plus `PERIPHERAL` for custom dispatch |
| `ArgType` | `LITERAL`, `REGISTER`, `STRING`, comparison operators (`EQUAL`, `NOTEQUAL`, `LESS`, `GREATER`, `LESSEQUAL`, `GREATEQUAL`) |
| `Instruction` | `{ operation, arguments, line, peripheralName? }` |
| `Argument` | `{ type: ArgType, value: number \| string }` |
| `RegValue` | `number \| string` |
| `PeripheralHandler` | `(vm: VM, args: Argument[]) => void` |
