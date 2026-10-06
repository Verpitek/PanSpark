<img src="https://verpitek.com/panspark.png" width="256">

# PanSpark VM
A lightweight assembly-like virtual machine designed for embedded simulation, peripheral scripting, and low-level programming experiments. Built for LunaTech.

## Features
- **Single Register Bank**: `r0`–`rN`, each register holds an integer or a string
- **Shared Heap Budget**: All registers draw from one byte pool (int = 2B, string = length + 1B)
- **Named Variables**: `$name = r0` / `$name = auto` declarations resolved at compile time
- **Full Instruction Set**: Arithmetic, control flow, and function calls
- **Custom OpCodes**: Register peripheral handlers at runtime — `MATH_FAC`, anything you want
- **Call Stack**: Recursion with configurable stack depth
- **State Persistence**: Save and restore complete VM state — resume anywhere
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

// register count, call stack depth, heap limit (bytes)
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

## Registers & Heap

PanSpark has a single bank of general-purpose registers. Each register holds either an integer or a string.

| Value Type | Byte Cost |
| :--- | :--- |
| Integer | 2 bytes |
| String | `string.length + 1` bytes |

All registers share one heap budget. Writing a value into a register frees the old value's cost and charges the new one. Exceeding the limit throws a heap overflow — the write is rejected and the register is unchanged.

```typescript
// 8 registers × 2 bytes each = 16 bytes, leaving 1264 of 1280 free
const vm = new VM(8, 256, 1280);
```

## Named Variables

Write `$name = <register>` or `$name = auto` at the top of your script. `auto` always assigns the next free register.

```arm
$counter  = r0      // bind $counter to r0
$result   = r1      // bind $result to r1
$scratch  = auto    // → r2 (next free register)
```

Explicit and `auto` declarations can coexist; `auto` tracks the highest explicitly claimed register. Names are substituted longest-first and only as whole names — using an undeclared `$name` or declaring the same name twice throws at compile time.

## Instruction Set

### Basic

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **SET** | `SET <val> >> <dest>` | Stores an integer, string, or register value |
| **PRINT** | `PRINT <val>` | Pushes the value to the output buffer |
| **NOP** | `NOP` | No operation |
| **HALT** | `HALT` | Immediately stops execution |

### Arithmetic

All arithmetic is **integer-only**. Passing a string register throws at runtime.

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **ADD** | `ADD a b >> dest` | `dest = a + b` |
| **SUB** | `SUB a b >> dest` | `dest = a - b` |
| **MUL** | `MUL a b >> dest` | `dest = a * b` |
| **DIV** | `DIV a b >> dest` | `dest = trunc(a / b)` — truncates toward zero, throws on zero |
| **MOD** | `MOD a b >> dest` | `dest = a % b` — remainder keeps the dividend's sign, throws on zero |
| **POW** | `POW b e >> dest` | `dest = b ^ e` |
| **SQRT** | `SQRT a >> dest` | `dest = floor(√a)` |
| **ABS** | `ABS a >> dest` | `dest = \|a\|` |
| **MIN** | `MIN a b >> dest` | Stores the smaller of two values |
| **MAX** | `MAX a b >> dest` | Stores the larger of two values |
| **RNG** | `RNG min max >> dest` | Random integer in `[min, max]` inclusive — throws if `min > max` |
| **INC** | `INC <reg>` | Increments register in-place |
| **DEC** | `DEC <reg>` | Decrements register in-place |

### Control Flow

| OpCode | Syntax | Description |
| :--- | :--- | :--- |
| **JUMP** | `JUMP <label>` | Unconditional jump to label |
| **POINT** | `POINT <label>` | Declares a label |
| **IF** | `IF v1 op v2 >> label [ELSE label]` | Conditional jump |
| **UNTIL** | `UNTIL v1 op v2` | Blocks execution until condition becomes true |
| **CALL** | `CALL <label>` | Push return address, jump to label |
| **RET** | `RET` | Pop return address, jump back |

**Operators:** `==`, `!=`, `<`, `>`, `<=`, `>=`

- `==` and `!=` work on integers and strings (content comparison) — comparing a string with an integer throws.
- `<`, `>`, `<=`, `>=` work on integers only — passing a string throws.

## Control Flow

### Loops

```arm
SET 10 >> r0

POINT loop
  PRINT r0
  DEC r0
  IF r0 > 0 >> loop

PRINT 999
HALT
```

### Conditional Jumps

```arm
IF r0 == 5 >> match
PRINT "no match"
HALT

POINT match
PRINT "match"
HALT
```

With an `ELSE` target:

```arm
IF r0 > 5 >> high ELSE low
PRINT 0
HALT

POINT high
PRINT 1
HALT

POINT low
PRINT 2
HALT
```

### Blocking Wait (UNTIL)

Stays on the instruction, yielding each cycle, until the condition becomes true. The intended use is waiting on a register to be updated by a peripheral or external host code.

```arm
UNTIL r0 == 1
PRINT "done"
HALT
```

### Functions (Call Stack)

```arm
POINT main
  SET 5 >> r0
  SET 1 >> r1
  CALL factorial
  PRINT r1
  HALT

POINT factorial
  IF r0 == 0 >> done
  MUL r1 r0 >> r1
  DEC r0
  CALL factorial

POINT done
  RET
```

Full recursion is supported up to the configured call stack depth.

## Custom OpCodes (Peripherals)

Any opcode not in the core set dispatches to a registered peripheral handler. Register handlers on the host before compiling. Handlers receive the full `vm` instance and can read and write registers.

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

Peripheral handler *functions* don't serialize — re-register them after `loadState()`.

## State Management

```typescript
const snapshot = vm.saveState();

const vm2 = new VM(8, 256, 1280);
vm2.registerPeripheral("MATH_FAC", ...); // handlers must be re-registered
vm2.loadState(snapshot);

for (const _ of vm2.run()) {}
```

**What survives:** instruction pointer, register values (integers and strings), call stack, output buffer, and compiled instructions (including peripheral names).

**What does not survive:** peripheral handler functions — they are code, not data.

Snapshots are versioned and validated on load: loading a snapshot with a different schema version, a mismatched register count, or malformed data throws.

## API

### VM Constructor
```typescript
new VM(registerMemoryLimit, callStackLimit, heapLimit)
```

| Parameter | Description |
| :--- | :--- |
| `registerMemoryLimit` | Number of registers (e.g. `8` → `r0`–`r7`) |
| `callStackLimit` | Max call stack depth |
| `heapLimit` | Total byte budget across all registers |

### Core Methods

| Method | Description |
| :--- | :--- |
| `compile(source)` | Compiles PanSpark source — resolves `$vars`, strips comments, yields each `Instruction` |
| `run()` | Executes instructions, yields after each |
| `reset()` | Clears execution state (ip, call stack, output, registers); keeps compiled instructions |
| `saveState()` | Serializes full VM state to a string |
| `loadState(state)` | Restores VM from a serialized state string |
| `registerPeripheral(name, handler)` | Registers a custom opcode handler |
| `unregisterPeripheral(name)` | Removes a custom opcode handler |
| `setMemory(data, dest)` | Writes a `number \| string` to a register |
| `fetchMemory(arg)` | Reads a number — throws on strings |
| `fetchValue(arg)` | Reads a `number \| string` from any argument type |
| `heapAvailable()` | Returns remaining heap bytes |
| `heapUsed()` | Returns consumed heap bytes |

## License
Apache 2.0
