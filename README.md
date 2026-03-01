# PanSpark VM
A lightweight assembly-like virtual machine designed for embedded simulation, peripheral scripting, and low-level programming experiments. Built for LunaTech.

## Features
- **Two Register Banks**: r-registers (`r0`–`rN`) for general-purpose use; x-registers (`x0`–`xN`) for machine-mapped peripheral slots — both hold integers, strings, or arrays
- **Shared Heap Budget**: All registers across both banks draw from one byte pool (int = 2B, string = length + 1B, array = 2B per element)
- **Named Variables**: `$name = r0` / `$name = x3` / `$name = auto` declarations resolved at compile time — `auto` assigns r-registers only
- **Full Instruction Set**: Arithmetic, logic, control flow, and function calls work on both banks equally
- **Custom OpCodes**: Register peripheral handlers at runtime — `MACH_GET`, `MATH_FAC`, anything you want
- **Call Stack**: Recursion with configurable stack depth
- **State Persistence**: Save and restore complete VM state — resume anywhere, even on a different machine
- **Yield-based Execution**: Generator-style execution for fine-grained step control
- **Event Waiting**: `UNTIL` instruction for blocking on conditions set by external code or peripherals

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) or anything that runs TypeScript

### Installation
```bash
git clone https://github.com/Verpitek/PanSpark.git
cd PanSpark
```

### Running Examples
```bash
bun run main.ts
```

## Basic Usage

```typescript
import { VM } from "./panspark";

// r-registers, x-registers, call stack depth, heap limit (bytes)
const vm = new VM(8, 16, 256, 1280);

const source = `
$counter = auto
$result  = auto

POINT main
  SET 10 >> $counter
  SET 0  >> $result

POINT loop
  ADD $result $counter >> $result
  DEC $counter
  IF $counter > 0 >> loop

  PRINT $result
  HALT
`;

for (const _ of vm.compile(source)) {}

const gen = vm.run();
while (!gen.next().done) {
  if (vm.outputBuffer.length > 0) console.log("Output:", vm.outputBuffer);
}
```

## Register Banks

PanSpark has two distinct register banks:

| Bank | Syntax | Purpose |
| :--- | :--- | :--- |
| **r-registers** | `r0`, `r1`, … | General-purpose scratch. Counters, temporaries, function arguments. |
| **x-registers** | `x0`, `x1`, … | Machine-mapped slots. Interface with hardware peripherals. |

Both banks are interchangeable as source or destination in any instruction. Both share the same heap budget.

```arm
SET 42 >> x0          // store integer in machine register
SET r0 >> x1          // copy r-register to x-register
ADD r0 x0 >> r1       // mix banks freely
IF x0 == r1 >> label  // compare across banks
```

## Named Variables

Write `$name = <register>` or `$name = auto` at the top of your script. `auto` always assigns the next free **r-register**. Machine registers must be declared explicitly.

```arm
$handle   = x0      // bind $handle to machine register x0
$progress = x1      // bind $progress to x1
$counter  = auto    // → r0 (next free r-register)
$result   = auto    // → r1
```

Explicit and `auto` declarations can coexist. Names are substituted longest-first to prevent partial-match bugs.

## Custom OpCodes (Peripherals)

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

Peripheral handlers can read and write both r- and x-registers via `fetchValue`, `fetchMemory`, and `setMemory`. Peripheral handler *functions* don't serialize — re-register them after `loadState()`.

## State Management

```typescript
const snapshot = vm.saveState();

const vm2 = new VM(8, 16, 256, 1280);
vm2.registerPeripheral("MATH_FAC", ...); // handlers must be re-registered
vm2.loadState(snapshot);

for (const _ of vm2.run()) {}
```

## API

### VM Constructor
```typescript
new VM(registerMemoryLimit, machineMemoryLimit, callStackLimit, heapLimit)
```

| Parameter | Description |
| :--- | :--- |
| `registerMemoryLimit` | Number of `r`-registers (e.g. `8` → `r0`–`r7`) |
| `machineMemoryLimit` | Number of `x`-registers (e.g. `16` → `x0`–`x15`) |
| `callStackLimit` | Max call stack depth |
| `heapLimit` | Total byte budget across **all** registers (both banks) |

### Core Methods

| Method | Description |
| :--- | :--- |
| `compile(source)` | Compiles PanSpark source — resolves `$vars`, strips comments, yields each `Instruction` |
| `run()` | Executes instructions, yields after each |
| `saveState()` | Serializes full VM state to a string (includes both register banks) |
| `loadState(state)` | Restores VM from a serialized state string |
| `registerPeripheral(name, handler)` | Registers a custom opcode handler |
| `unregisterPeripheral(name)` | Removes a custom opcode handler |
| `setMemory(data, dest)` | Writes `number \| string \| number[]` to an r- or x-register |
| `fetchMemory(arg)` | Reads a number — throws on strings or arrays |
| `fetchValue(arg)` | Reads a `number \| string \| number[]` from any argument type |
| `heapAvailable()` | Returns remaining heap bytes (across both banks) |

## Array Operations

PanSpark supports first-class arrays of numbers. Arrays can be stored in r- or x-registers and all array operations work on both banks.

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **SET** (array literal) | `SET [1,2,3] >> dest` | Creates an array with the given elements |
| **ARR_NEW** | `ARR_NEW size >> dest` | Creates a zero-filled array of given length |
| **ARR_PUSH** | `ARR_PUSH arr val` | Appends value to array |
| **ARR_POP** | `ARR_POP arr >> dest` | Removes last element, stores in dest (0 if empty) |
| **ARR_GET** | `ARR_GET arr idx >> dest` | Reads element at index |
| **ARR_SET** | `ARR_SET arr idx val` | Writes element at index |
| **ARR_LEN** | `ARR_LEN arr >> dest` | Stores array length in dest |
| **ARR_SORT** | `ARR_SORT arr` | Sorts array in ascending order |

- Empty array literals (`[]`) are not allowed; use `ARR_NEW 0`.
- Arrays cannot contain strings, only numbers.
- Heap cost: 2 bytes per array element.
- `IF` comparisons on arrays compare the **sum** of elements for equality and ordering.

### Example
```arm
SET [10,20,30] >> x0    // array in machine register
ARR_PUSH x0 40
ARR_GET x0 1 >> r0      // cross-bank: read into r-register
PRINT r0                // 20
ARR_SET x0 0 99
PRINT x0                // [99,20,30,40]
ARR_LEN x0 >> r1
PRINT r1                // 4
ARR_SORT x0
PRINT x0                // [20,30,40,99]
HALT
```

## Example Programs

### Factorial (Recursive)
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

### Machine Monitor (x-registers)
```arm
// Peripheral writes machine state into x-registers each tick
$handle   = x0
$enabled  = x1
$progress = x2

POINT main
  MACH_OPEN "macerator_1" >> $handle

POINT poll
  MACH_GET $handle "enabled"  >> $enabled
  MACH_GET $handle "progress" >> $progress
  PRINT $enabled
  PRINT $progress
  IF $progress == 100 >> done
  JUMP poll

POINT done
  MACH_SET $handle "enabled" 0
  MACH_CLOSE $handle
  HALT
```

### Item Router (mixed banks)
```arm
$item = r0     // general-purpose register for current item
$dest = r1
$slot = x0     // machine register — peripheral writes the item type here

POINT main
  UNTIL $slot != 0
  SET $slot >> $item

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
  SET 0 >> $slot
  JUMP main
```

## License
Apache 2.0
