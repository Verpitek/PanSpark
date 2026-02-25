# PanSpark Language Guide

PanSpark is a low-level, assembly-like language designed for a custom virtual machine built for LunaTech. It supports tagged registers, a shared heap budget, stack-based recursion, event-based blocking, named variable declarations, and user-defined peripheral opcodes.

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

- **Registers (`r0`–`rN`):** The only storage type. Can hold integers or strings.
- **Heap:** Shared byte budget across all registers.
- **Labels:** Named markers for jumps and function calls.
- **Peripherals:** Custom opcodes registered at the host level for hardware interaction.
- **Named Variables:** `$name` aliases resolved at compile time — no runtime cost.

---

## Memory Model

PanSpark has one storage type: registers.

| Type | Prefix | Range | Description |
| :--- | :--- | :--- | :--- |
| **Registers** | `r` | `r0`–`rN` | General purpose. Math, counters, strings, peripheral handles — everything. |

---

## Heap Budget

All registers share a single byte pool. The VM checks the budget on every write.

| Value Type | Byte Cost |
| :--- | :--- |
| Integer | 2 bytes |
| String | `string.length + 1` bytes |
| Array | `2 × element_count` bytes |

```typescript
// 8 registers, default int each = 16 bytes baseline
// heapLimit 1280 → 1264 bytes free for strings
const vm = new VM(8, 256, 1280);
```

Writing a string into a register deducts its size from the pool and refunds the old value's size. Exceeding the limit throws a heap overflow error — the write is rejected and the register is unchanged.

---

## Named Variables

`$name` declarations are resolved by the compiler as its first pass, before anything else runs. There is no separate precompile step — just pass your source to `compile()` as normal.

### Syntax

```arm
$name = r2     // explicit: bind $name to register r2
$name = auto   // auto: assign next available register
```

- Declaration lines are stripped from the compiled output.
- `auto` tracks the highest explicitly claimed index to avoid collisions.
- Explicit and `auto` declarations can coexist freely.
- Names are substituted longest-first to prevent partial-match bugs (`$foobar` before `$foo`).

### Example

```arm
$handle   = r0
$index    = auto   // → r1
$count    = auto   // → r2
$progress = auto   // → r3

POINT main
  SET 0 >> $index
  MACH_LIST >> $count

POINT loop
  IF $index >= $count >> done
  MACH_OPEN $index >> $handle
  MACH_GET $handle "progress" >> $progress
  PRINT $progress
  MACH_CLOSE $handle
  INC $index
  JUMP loop

POINT done
  HALT
```

After variable resolution, the compiler sees plain `r0`, `r1`, `r2`, `r3` — identical to writing them by hand.

---

## Syntax Rules

1. **Assignment (`>>`):** Operations that produce a value use `>>` to point to the destination.
   - Correct: `SET 10 >> r0`
   - Incorrect: `SET 10 r0`
2. **Comments:** Own line only, starting with `//`. Inline comments not supported.
3. **Case Sensitivity:** OpCodes strictly **UPPERCASE**. Peripheral names follow the same convention.
4. **Whitespace:** Arguments separated by single spaces.
5. **Labels:** Named markers used with `POINT`. Do not use numbers as label names.
6. **String Literals:** Enclosed in double quotes — `SET "iron_ore" >> r0`.
7. **Variable Declarations:** `$name = r0` or `$name = auto`. Top of file by convention, before first use.

---

## Operation Reference

### Basic Operations

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **SET** | `SET <val> >> <dest>` | Stores a value into a register. `val` can be a literal, string, or register. |
| **PRINT** | `PRINT <val>` | Pushes the value to the output buffer. Supports integers and strings. |
| **NOP** | `NOP` | No Operation. |
| **HALT** | `HALT` | Immediately stops execution. |

### Arithmetic & Logic

All arithmetic operations are **integer-only**. Passing a string register throws at runtime.

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **ADD** | `ADD a b >> dest` | `dest = a + b` |
| **SUB** | `SUB a b >> dest` | `dest = a - b` |
| **MUL** | `MUL a b >> dest` | `dest = a * b` |
| **DIV** | `DIV a b >> dest` | `dest = a / b` — throws on zero |
| **MOD** | `MOD a b >> dest` | `dest = a % b` — throws on zero |
| **POW** | `POW b e >> dest` | `dest = b ^ e` |
| **SQRT** | `SQRT a >> dest` | `dest = √a` |
| **ABS** | `ABS a >> dest` | `dest = \|a\|` |
| **MIN** | `MIN a b >> dest` | Stores the smaller of two values |
| **MAX** | `MAX a b >> dest` | Stores the larger of two values |
| **RNG** | `RNG min max >> dest` | Random integer in `[min, max]` inclusive |

### Shortcuts

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **INC** | `INC <reg>` | Increments in-place |
| **DEC** | `DEC <reg>` | Decrements in-place |

### Array Operations

Arrays are first-class values of type `number[]`. Empty array literals (`[]`) are not allowed; use `ARR_NEW 0`. Arrays cannot contain strings, only numbers.

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **SET** (array literal) | `SET [1,2,3] >> dest` | Creates array with given elements |
| **ARR_NEW** | `ARR_NEW size >> dest` | Creates zero-filled array of given length |
| **ARR_PUSH** | `ARR_PUSH arr val` | Appends value to array |
| **ARR_POP** | `ARR_POP arr >> dest` | Removes last element, stores in dest (0 if empty) |
| **ARR_GET** | `ARR_GET arr idx >> dest` | Reads element at index |
| **ARR_SET** | `ARR_SET arr idx val` | Writes element at index |
| **ARR_LEN** | `ARR_LEN arr >> dest` | Stores array length in dest |
| **ARR_SORT** | `ARR_SORT arr` | Sorts array in ascending order |

- Heap cost: 2 bytes per element.
- `IF` comparisons on arrays compare the **sum** of elements for equality and ordering.

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

- `==` and `!=` work on integers, strings (content comparison), and arrays (sum equality).
- `<`, `>`, `<=`, `>=` work on integers and arrays (sum ordering) — passing a string throws.

If the condition is true, execution jumps to `label_true`. If the condition is false and an `ELSE` clause is provided, execution jumps to `label_false`; otherwise execution continues to the next instruction.

### Blocking Wait (UNTIL)

```
UNTIL <val1> <op> <val2>
```

Stays on this instruction, yielding each cycle, until the condition becomes true. Same operator rules as `IF`.

### Functions (Call Stack)

```
CALL <label>   // push return address, jump to label
RET            // pop return address, jump back
```

Full recursion supported up to the configured call stack depth.

---

## Custom OpCodes (Peripherals)

Any opcode not in the core set dispatches to a registered peripheral handler. Register handlers on the host before compiling.

```typescript
vm.registerPeripheral("MACH_OPEN", (vm, args) => {
  const name   = vm.fetchValue(args[0]) as string;
  const handle = machineRegistry.open(name);
  vm.setMemory(handle, args[1]);
});

vm.registerPeripheral("MACH_GET", (vm, args) => {
  const handle   = vm.fetchMemory(args[0]);
  const property = vm.fetchValue(args[1]) as string;
  vm.setMemory(machineRegistry.get(handle, property), args[2]);
});

vm.registerPeripheral("MACH_SET", (vm, args) => {
  const handle   = vm.fetchMemory(args[0]);
  const property = vm.fetchValue(args[1]) as string;
  machineRegistry.set(handle, property, vm.fetchValue(args[2]));
});

vm.registerPeripheral("MACH_CLOSE", (vm, args) => {
  machineRegistry.close(vm.fetchMemory(args[0]));
});
```

```arm
$handle   = auto
$progress = auto

MACH_OPEN "macerator_1" >> $handle
MACH_GET $handle "progress" >> $progress
PRINT $progress
MACH_CLOSE $handle
HALT
```

**Peripheral names survive serialization** (stored on each instruction). Handler *functions* do not — re-register them after `loadState()`.

---

## State Persistence

Complete VM state serializes to a plain string and restores on any VM instance with the same configuration.

```typescript
const snapshot = vm.saveState();

const vm2 = new VM(8, 256, 1280);
vm2.registerPeripheral("MACH_OPEN",  ...);
vm2.registerPeripheral("MACH_GET",   ...);
vm2.registerPeripheral("MACH_SET",   ...);
vm2.registerPeripheral("MACH_CLOSE", ...);
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
$signal = r0

POINT wait_for_press
  UNTIL $signal == 1
  PRINT 123
  UNTIL $signal == 0
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

### 3. Simple Loop

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

### 4. Array Operations Example

```arm
$arr   = auto
$len   = auto
$elem  = auto

SET [5,1,9,3] >> $arr
ARR_SORT $arr
PRINT $arr          // [1,3,5,9]
ARR_PUSH $arr 7
PRINT $arr          // [1,3,5,9,7]
ARR_SORT $arr
PRINT $arr          // [1,3,5,7,9]
ARR_LEN $arr >> $len
PRINT $len          // 5
ARR_GET $arr 2 >> $elem
PRINT $elem         // 5
ARR_SET $arr 0 99
PRINT $arr          // [99,3,5,7,9]

// Compare array sum with number
IF $arr > 100 >> big
PRINT "sum <= 100"
HALT
POINT big
PRINT "sum > 100"
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

### 5. Machine Monitor

```arm
$handle   = auto
$enabled  = auto
$progress = auto
$input    = auto

POINT main
  MACH_OPEN "macerator_1" >> $handle

POINT poll
  MACH_GET $handle "enabled"  >> $enabled
  MACH_GET $handle "progress" >> $progress
  MACH_GET $handle "input"    >> $input

  IF $enabled  == 0   >> start_machine
  IF $input    == 0   >> idle
  IF $progress == 100 >> done

  JUMP poll

POINT start_machine
  MACH_SET $handle "enabled" 1
  JUMP poll

POINT idle
  JUMP poll

POINT done
  MACH_SET $handle "enabled" 0
  MACH_CLOSE $handle
  HALT
```

### 6. String-Based Item Router

```arm
$item = auto
$dest = auto

POINT main
  UNTIL $item != 0

  IF $item == "iron_ore" >> route_iron
  IF $item == "gold_ore" >> route_gold
  JUMP dump

POINT route_iron
  SET 3 >> $dest
  JUMP send

POINT route_gold
  SET 7 >> $dest
  JUMP send

POINT dump
  SET 0 >> $dest

POINT send
  MACH_SET 0 "destination" $dest
  SET 0 >> $item
  JUMP main
```

---

## VM API Reference

### Initialization

```typescript
import { VM } from "./panspark";

const vm = new VM(8, 256, 1280);
// registerMemoryLimit, callStackLimit, heapLimit
```

### Core Methods

| Method | Returns | Description |
| :--- | :--- | :--- |
| `compile(source)` | `Generator<Instruction>` | Resolves `$vars`, strips comments, compiles to instructions |
| `run()` | `Generator<void>` | Executes instructions, yields after each |
| `saveState()` | `string` | Serializes full VM state |
| `loadState(state)` | `void` | Restores VM from serialized state |
| `registerPeripheral(name, fn)` | `void` | Registers a custom opcode handler |
| `unregisterPeripheral(name)` | `void` | Removes a custom opcode handler |
| `setMemory(data, dest)` | `void` | Writes `number \| string` to a register |
| `fetchMemory(arg)` | `number` | Reads a number — throws if the register holds a string |
| `fetchValue(arg)` | `number \| string` | Reads any value type |
| `heapAvailable()` | `number` | Remaining heap bytes |

### Enums and Types

| Name | Description |
| :--- | :--- |
| `OpCode` | All built-in operations plus `PERIPHERAL` for custom dispatch |
| `ArgType` | `LITERAL`, `REGISTER`, `STRING`, `ARRAY`, comparison operators |
| `Instruction` | `{ operation, arguments, line, peripheralName? }` |
| `Argument` | `{ type: ArgType, value: number \| string \| number[] }` |
| `RegValue` | `{ tag: "int", data: number } \| { tag: "string", data: string } \| { tag: "array", data: number[] }` |
| `PeripheralHandler` | `(vm: VM, args: Argument[]) => void` |
