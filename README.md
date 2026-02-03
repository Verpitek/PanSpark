# PanSpark VM

A lightweight 16-bit virtual machine with an assembly-like language, designed for embedded simulation, education, and low-level programming experiments.

## Features

- **16-bit Architecture**: All values are 16-bit signed integers
- **Dual Memory Spaces**: Registers (`r0-rN`) and machine memory (`x0-xN`) with separate limits
- **Full Instruction Set**: Arithmetic, logic, control flow, and function calls
- **Call Stack**: Support for recursion with configurable stack depth
- **RAM Memory**: Separate RAM space for general-purpose storage
- **State Persistence**: Save and restore complete VM state including registers, memory, call stack, output buffer, and RAM
- **Yield-based Execution**: Generator-style execution for fine-grained control
- **Event Waiting**: `UNTIL` instruction for blocking on conditions

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) (JavaScript runtime) or basically anything that runs javascript :P

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

// Create VM with 16 registers, 16 machine memory slots, 256 call stack, 1024 RAM
const vm = new VM(16, 16, 256, 1024);

// Compile PanSpark code
const code = `
POINT main
  SET 67 >> r0
  PRINT r0
  HALT
`;

const instructions = Array.from(vm.compile(code));

// Execute
const gen = vm.run();
while (!gen.next().done) {
  if (vm.outputBuffer.length > 0) {
    console.log("Output:", vm.outputBuffer);
  }
}
```

## State Management

The VM supports complete state serialization:

```typescript
// Save current state
const savedState = vm.saveState();

// Create new VM and restore state
const vm2 = new VM(16, 16, 256, 1024);
vm2.loadState(savedState);

// Continue execution from saved point
const gen2 = vm2.run();
```

State format: `instructionPos|registers|machineMemory|callStack|output|ram|instructions`

## Language Reference

See [WIKI.md](WIKI.md) for complete language documentation including:
- Syntax rules and memory model
- Complete operation reference (SET, ADD, SUB, MUL, DIV, etc.)
- Control flow (JUMP, IF, UNTIL)
- Functions (CALL, RET)
- Examples and patterns

## API

### VM Constructor
```typescript
new VM(registerMemoryLimit, machineMemoryLimit, callStackLimit, ramLimit)
```

### Core Methods
- `compile(code: string): Generator<Instruction>` - Compiles PanSpark source to instructions
- `run(): Generator<void>` - Executes compiled instructions (yields after each instruction)
- `saveState(): string` - Serializes current VM state
- `loadState(state: string): void` - Restores VM from serialized state
- `setMemory(data: number, dest: Argument): void` - Writes to register/memory
- `fetchMemory(arg: Argument): number` - Reads from register/memory/literal

### Memory Access
- Registers: `r0`, `r1`, ... `rN`
- Machine Memory: `x0`, `x1`, ... `xN`
- RAM: Direct array access via `vm.ram[index]`

## Example Programs

### Factorial Calculation
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

### Event Loop with UNTIL
```arm
// Wait for external event (e.g., button press)
POINT main
  UNTIL x0 == 1  // Wait for hardware signal
  PRINT 100
  JUMP main
```

## Performance

The VM uses typed arrays (Int16Array) for memory operations and compiles source to an intermediate representation for efficient execution.

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing patterns and conventions
- New features include appropriate documentation
- Changes are tested with the existing examples

## License

[Add appropriate license]
