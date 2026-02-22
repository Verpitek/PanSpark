# PanSpark VM
A lightweight assembly-like virtual machine designed for embedded simulation, peripheral scripting, and low-level programming experiments. Built for LunaTech.

## Features
- **Tagged Registers**: Hold integers (2 bytes) or strings (length + 1 byte) within a shared heap budget
- **Named Variables**: `$name = r0` / `$name = auto` declarations resolved automatically at compile time
- **Full Instruction Set**: Arithmetic, logic, control flow, and function calls
- **Custom OpCodes**: Register peripheral handlers at runtime — `MACH_GET`, `MATH_FAC`, anything you want
- **Call Stack**: Recursion with configurable stack depth
- **State Persistence**: Save and restore complete VM state — resume anywhere, even on a different machine
- **Yield-based Execution**: Generator-style execution for fine-grained step control
- **Event Waiting**: `UNTIL` instruction for blocking on conditions

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

// registers, call stack depth, heap limit (bytes)
const vm = new VM(8, 256, 1280);

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

## Named Variables

Write `$name = <register>` or `$name = auto` at the top of your script. The compiler resolves these before doing anything else — no separate step needed.

```arm
$handle  = r0
$index   = auto   // → r1
$count   = auto   // → r2

POINT main
  SET 0 >> $index
  MACH_LIST >> $count

POINT loop
  IF $index >= $count >> done
  MACH_OPEN $index >> $handle
  // ...
  INC $index
  JUMP loop

POINT done
  HALT
```

Explicit and `auto` assignments can coexist. `auto` always picks the next register not already claimed.

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

Peripheral handlers are functions — they don't serialize. Re-register them after `loadState()`.

## State Management

```typescript
const snapshot = vm.saveState();

const vm2 = new VM(8, 256, 1280);
vm2.registerPeripheral("MATH_FAC", ...); // handlers must be re-registered
vm2.loadState(snapshot);

for (const _ of vm2.run()) {}
```

## API

### VM Constructor
```typescript
new VM(registerMemoryLimit, callStackLimit, heapLimit)
```

| Parameter | Description |
| :--- | :--- |
| `registerMemoryLimit` | Number of `r` registers (e.g. `8` → `r0`–`r7`) |
| `callStackLimit` | Max call stack depth |
| `heapLimit` | Total byte budget across all registers (int = 2B, string = length + 1B) |

### Core Methods

| Method | Description |
| :--- | :--- |
| `compile(source)` | Compiles PanSpark source — resolves `$vars`, strips comments, yields each `Instruction` |
| `run()` | Executes instructions, yields after each |
| `saveState()` | Serializes full VM state to a string |
| `loadState(state)` | Restores VM from a serialized state string |
| `registerPeripheral(name, handler)` | Registers a custom opcode handler |
| `unregisterPeripheral(name)` | Removes a custom opcode handler |
| `setMemory(data, dest)` | Writes `number \| string` to a register |
| `fetchMemory(arg)` | Reads a number — throws on strings |
| `fetchValue(arg)` | Reads a `number \| string` from any argument type |
| `heapAvailable()` | Returns remaining heap bytes |

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

### Machine Monitor
```arm
$handle   = auto
$enabled  = auto
$progress = auto

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

## License
Apache 2.0