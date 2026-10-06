// PanSpark VM — a lightweight assembly-like register machine.
//
// Registers hold an integer or a string. All registers share one heap
// budget: an integer costs 2 bytes, a string costs length + 1 bytes.

export enum OpCode {
  SET,
  ADD,
  SUB,
  PRINT,
  JUMP,
  POINT,
  IF,
  MUL,
  DIV,
  MOD,
  SQRT,
  POW,
  ABS,
  MIN,
  MAX,
  INC,
  DEC,
  RNG,
  NOP,
  HALT,
  UNTIL,
  CALL,
  RET,
  // internal — dispatches to a registered peripheral handler
  PERIPHERAL,
}

export enum ArgType {
  LITERAL = 0,
  REGISTER = 1,
  EQUAL = 2,
  NOTEQUAL = 3,
  LESS = 4,
  GREATER = 5,
  LESSEQUAL = 6,
  GREATEQUAL = 7,
  STRING = 8,
}

export interface Argument {
  type: ArgType;
  value: number | string;
}

export interface Instruction {
  operation: OpCode;
  arguments: Argument[];
  line: number;
  peripheralName?: string;
}

export type RegValue = number | string;

export type PeripheralHandler = (vm: VM, args: Argument[]) => void;

// -------------------------------------------------------------------
// Internal helpers
// -------------------------------------------------------------------
function byteSize(v: RegValue): number {
  return typeof v === "number" ? 2 : v.length + 1;
}

/** Tokenizer that keeps double-quoted strings as single tokens. */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === " " || line[i] === "\t") {
      i++;
      continue;
    }
    if (line[i] === '"') {
      let j = i + 1;
      while (j < line.length && line[j] !== '"') j++;
      if (j >= line.length)
        throw Error(`Unterminated string literal: ${line}`);
      tokens.push(line.slice(i, j + 1));
      i = j + 1;
    } else {
      let j = i;
      while (j < line.length && line[j] !== " " && line[j] !== "\t") j++;
      tokens.push(line.slice(i, j));
      i = j;
    }
  }
  return tokens;
}

function parseArgument(arg: string, line: number): Argument {
  if (arg.startsWith('"') && arg.endsWith('"'))
    return { type: ArgType.STRING, value: arg.slice(1, -1) };
  if (arg.startsWith("$"))
    throw Error(`Undefined variable "${arg}" at line ${line + 1}`);
  const reg = arg.match(/^r(\d+)$/);
  if (reg) return { type: ArgType.REGISTER, value: parseInt(reg[1]) };
  if (arg === "==") return { type: ArgType.EQUAL, value: 0 };
  if (arg === "!=") return { type: ArgType.NOTEQUAL, value: 0 };
  if (arg === "<") return { type: ArgType.LESS, value: 0 };
  if (arg === ">") return { type: ArgType.GREATER, value: 0 };
  if (arg === "<=") return { type: ArgType.LESSEQUAL, value: 0 };
  if (arg === ">=") return { type: ArgType.GREATEQUAL, value: 0 };
  if (/^-?\d+$/.test(arg)) return { type: ArgType.LITERAL, value: parseInt(arg) };
  throw Error(`Invalid argument "${arg}" at line ${line + 1}`);
}

const expectedArgCount: Partial<Record<OpCode, number>> = {
  [OpCode.SET]: 2,
  [OpCode.ADD]: 3, [OpCode.SUB]: 3, [OpCode.MUL]: 3, [OpCode.DIV]: 3,
  [OpCode.MOD]: 3, [OpCode.POW]: 3, [OpCode.MIN]: 3, [OpCode.MAX]: 3,
  [OpCode.SQRT]: 2, [OpCode.ABS]: 2,
  [OpCode.PRINT]: 1,
  [OpCode.JUMP]: 1, [OpCode.CALL]: 1, [OpCode.POINT]: 1,
  [OpCode.UNTIL]: 3,
  [OpCode.INC]: 1, [OpCode.DEC]: 1,
  [OpCode.RNG]: 3,
  [OpCode.NOP]: 0, [OpCode.HALT]: 0, [OpCode.RET]: 0,
};

function buildInstruction(
  operation: OpCode,
  tokens: string[],
  line: number,
  peripheralName?: string,
): Instruction {
  const argArr: Argument[] = [];
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] !== ">>" && tokens[i] !== "ELSE")
      argArr.push(parseArgument(tokens[i], line));
  }
  const expected = expectedArgCount[operation];
  if (expected !== undefined && argArr.length !== expected) {
    throw Error(
      `${OpCode[operation]} expects ${expected} argument(s) but got ${argArr.length} at line ${line + 1}`,
    );
  }
  return { operation, arguments: argArr, line, peripheralName };
}

const comparisonTypes = new Set<ArgType>([
  ArgType.EQUAL,
  ArgType.NOTEQUAL,
  ArgType.LESS,
  ArgType.GREATER,
  ArgType.LESSEQUAL,
  ArgType.GREATEQUAL,
]);

function assertComparison(instruction: Instruction): void {
  const op = instruction.arguments[1];
  if (!op || !comparisonTypes.has(op.type))
    throw Error(
      `Invalid comparison operator at line ${instruction.line + 1}`,
    );
}

/** Evaluates an IF/UNTIL comparison. */
function evaluateIf(vm: VM, instruction: Instruction): boolean {
  const a = instruction.arguments[0];
  const op = instruction.arguments[1];
  const b = instruction.arguments[2];

  const asNumber = (arg: Argument): number => {
    const val = vm.fetchValue(arg);
    if (typeof val === "string")
      throw Error(
        `Expected number but got string "${val}" at line: ${vm.activeInstructionPos + 1}`,
      );
    return val;
  };

  switch (op.type) {
    case ArgType.EQUAL: {
      const aVal = vm.fetchValue(a);
      const bVal = vm.fetchValue(b);
      if (typeof aVal !== typeof bVal)
        throw Error(
          `Cannot compare string and integer at line: ${vm.activeInstructionPos + 1}`,
        );
      return aVal === bVal;
    }
    case ArgType.NOTEQUAL: {
      const aVal = vm.fetchValue(a);
      const bVal = vm.fetchValue(b);
      if (typeof aVal !== typeof bVal)
        throw Error(
          `Cannot compare string and integer at line: ${vm.activeInstructionPos + 1}`,
        );
      return aVal !== bVal;
    }
    case ArgType.LESS:
      return asNumber(a) < asNumber(b);
    case ArgType.GREATER:
      return asNumber(a) > asNumber(b);
    case ArgType.LESSEQUAL:
      return asNumber(a) <= asNumber(b);
    case ArgType.GREATEQUAL:
      return asNumber(a) >= asNumber(b);
    default:
      return false;
  }
}

// -------------------------------------------------------------------
// VM
// -------------------------------------------------------------------
export class VM {
  public outputBuffer: RegValue[] = [];
  public instructions: Instruction[] = [];
  public callStack: Int16Array;
  public stackPointer: number = 0;
  public activeInstructionPos: number = 0;
  public registerMemoryLimit: number;
  public callStackLimit: number;
  public heapLimit: number;
  public registerMemory: RegValue[];
  public runFastFlag: boolean = false;

  private peripherals: Map<string, PeripheralHandler> = new Map();

  /**
   * @param registerMemoryLimit  Number of r-registers  (e.g. 8  → r0–r7)
   * @param callStackLimit       Max call stack depth    (e.g. 256)
   * @param heapLimit            Total byte budget across all registers
   */
  constructor(
    registerMemoryLimit: number,
    callStackLimit: number,
    heapLimit: number,
  ) {
    this.registerMemoryLimit = registerMemoryLimit;
    this.callStackLimit = callStackLimit;
    this.heapLimit = heapLimit;
    this.registerMemory = Array.from({ length: registerMemoryLimit }, () => 0);
    this.callStack = new Int16Array(callStackLimit).fill(0);
  }

  // -------------------------------------------------------------------
  // Peripheral API
  // -------------------------------------------------------------------
  public registerPeripheral(name: string, handler: PeripheralHandler): void {
    this.peripherals.set(name, handler);
  }

  public unregisterPeripheral(name: string): void {
    this.peripherals.delete(name);
  }

  // -------------------------------------------------------------------
  // Heap accounting
  // -------------------------------------------------------------------
  private totalHeapUsed(): number {
    return this.registerMemory.reduce((sum, v) => sum + byteSize(v), 0);
  }

  public heapUsed(): number {
    return this.totalHeapUsed();
  }

  public heapAvailable(): number {
    return this.heapLimit - this.totalHeapUsed();
  }

  // -------------------------------------------------------------------
  // Memory access
  // -------------------------------------------------------------------
  public setMemory(data: RegValue, dest: Argument): void {
    if (dest.type !== ArgType.REGISTER) {
      throw Error(
        dest.type === ArgType.LITERAL
          ? `Memory destination cannot be a LITERAL at line: ${this.activeInstructionPos + 1}`
          : `Illegal memory destination at line: ${this.activeInstructionPos + 1}`,
      );
    }
    const idx = dest.value as number;
    if (idx >= this.registerMemoryLimit || idx < 0)
      throw Error("Outside register memory bounds!");

    const delta = byteSize(data) - byteSize(this.registerMemory[idx]);
    if (this.totalHeapUsed() + delta > this.heapLimit) {
      throw Error(
        `Heap overflow! Need ${delta} more bytes but only ${this.heapAvailable()} available.`,
      );
    }

    this.registerMemory[idx] = data;
  }

  /** Reads any value (number or string) from any argument type. */
  public fetchValue(arg: Argument): RegValue {
    if (arg.type === ArgType.LITERAL) return arg.value as number;
    if (arg.type === ArgType.STRING) return arg.value as string;
    if (arg.type === ArgType.REGISTER) {
      const idx = arg.value as number;
      if (idx >= this.registerMemoryLimit || idx < 0)
        throw Error("Outside register memory bounds!");
      return this.registerMemory[idx];
    }
    throw Error(
      `Empty or illegal memory fetch at line: ${this.activeInstructionPos + 1}`,
    );
  }

  /** Reads a number. Throws if the register holds a string. */
  public fetchMemory(arg: Argument): number {
    const v = this.fetchValue(arg);
    if (typeof v === "string") {
      throw Error(
        `Expected number but got string "${v}" at line: ${this.activeInstructionPos + 1}`,
      );
    }
    return v;
  }

  // -------------------------------------------------------------------
  // Call stack
  // -------------------------------------------------------------------
  public pushCallStack(returnAddr: number): void {
    if (this.stackPointer >= this.callStackLimit)
      throw Error("Stack overflow!");
    this.callStack[this.stackPointer++] = returnAddr;
  }

  public popCallStack(): number {
    if (this.stackPointer <= 0) throw Error("Stack underflow!");
    return this.callStack[--this.stackPointer];
  }

  // -------------------------------------------------------------------
  // Serialisation
  // -------------------------------------------------------------------
  private static readonly SCHEMA_VERSION = 1;

  public saveState(): string {
    return JSON.stringify({
      version: VM.SCHEMA_VERSION,
      ip: this.activeInstructionPos,
      registers: this.registerMemory,
      callStack: Array.from(this.callStack.slice(0, this.stackPointer)),
      output: this.outputBuffer,
      instructions: this.instructions,
    });
  }

  public loadState(state: string): void {
    let s: any;
    try {
      s = JSON.parse(state);
    } catch {
      throw Error("Invalid state: not valid JSON");
    }
    if (!s || typeof s !== "object")
      throw Error("Invalid state: expected an object");
    if (s.version !== VM.SCHEMA_VERSION)
      throw Error(
        `Unsupported state version: ${s.version} (expected ${VM.SCHEMA_VERSION})`,
      );
    if (!Array.isArray(s.registers) || s.registers.length !== this.registerMemoryLimit)
      throw Error(
        `State register count mismatch: expected ${this.registerMemoryLimit}`,
      );
    if (!s.registers.every((v: unknown) => typeof v === "number" || typeof v === "string"))
      throw Error("Invalid state: registers must be numbers or strings");
    if (
      !Array.isArray(s.callStack) ||
      !s.callStack.every((v: unknown) => typeof v === "number")
    )
      throw Error("Invalid state: callStack must be an array of numbers");
    if (!Array.isArray(s.instructions))
      throw Error("Invalid state: instructions must be an array");
    if (
      !Array.isArray(s.output) ||
      !s.output.every((v: unknown) => typeof v === "number" || typeof v === "string")
    )
      throw Error("Invalid state: output must be an array of numbers or strings");
    if (typeof s.ip !== "number" || s.ip < 0 || s.ip > s.instructions.length)
      throw Error("Invalid state: ip out of range");

    this.activeInstructionPos = s.ip;
    this.registerMemory = [...s.registers];

    this.callStack.fill(0);
    this.stackPointer = 0;
    if (s.callStack.length > 0) {
      if (s.callStack.length > this.callStackLimit)
        throw Error("Invalid state: callStack exceeds call stack limit");
      this.stackPointer = s.callStack.length;
      s.callStack.forEach((v: number, i: number) => (this.callStack[i] = v));
    }

    this.outputBuffer = s.output;
    this.instructions = s.instructions;
  }

  /** Clears execution state (ip, call stack, output, registers). Compiled instructions are kept. */
  public reset(): void {
    this.activeInstructionPos = 0;
    this.stackPointer = 0;
    this.callStack.fill(0);
    this.outputBuffer = [];
    this.registerMemory = Array.from(
      { length: this.registerMemoryLimit },
      () => 0,
    );
  }

  // -------------------------------------------------------------------
  // Compiler
  // -------------------------------------------------------------------
  /**
   * Pass 0 — resolve $name declarations.
   * $name = r2     explicit register
   * $name = auto   next available register
   * Declaration lines are stripped. All $name occurrences in remaining
   * lines are replaced with their register string. Longest names are
   * substituted first to avoid partial-match bugs ($foobar before $foo).
   */
  private resolveVariables(source: string): string {
    const vars = new Map<string, string>();
    let autoCounter = 0;
    const output: string[] = [];
    const lines = source.split(/\r?\n/);
    for (let li = 0; li < lines.length; li++) {
      const trimmed = lines[li].trimStart();
      const decl = trimmed.match(/^\$(\w+)\s*=\s*(\S+)$/);

      if (decl) {
        const varName = `$${decl[1]}`;
        const target = decl[2];
        if (vars.has(varName))
          throw Error(
            `Duplicate variable declaration "${varName}" at line ${li + 1}`,
          );
        if (target === "auto") {
          vars.set(varName, `r${autoCounter++}`);
        } else {
          if (!/^r\d+$/.test(target))
            throw Error(
              `Only r-registers can be declared (got "${target}") at line ${li + 1}`,
            );
          vars.set(varName, target);
          const idx = parseInt(target.slice(1));
          if (idx >= autoCounter) autoCounter = idx + 1;
        }
        continue; // strip declaration
      }

      let resolved = trimmed;
      // longest names first, and only whole names, to prevent partial matches
      const sorted = [...vars.entries()].sort(
        (a, b) => b[0].length - a[0].length,
      );
      for (const [name, reg] of sorted) {
        const pattern = new RegExp(
          name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\w$])",
          "g",
        );
        resolved = resolved.replace(pattern, reg);
      }
      output.push(resolved);
    }

    return output.join("\n");
  }

  public *compile(source: string) {
    this.instructions = [];

    // Pass 0 — variable substitution
    const code = this.resolveVariables(source);
    // Pass 1 — strip blanks and comments
    const sanitized: string[] = [];
    for (const raw of code.split(/\r?\n/)) {
      const trimmed = raw.trimStart();
      if (!trimmed || trimmed.startsWith("//")) continue;
      sanitized.push(trimmed);
    }

    // Pass 2 — collect POINT labels → instruction index
    const pointMemory = new Map<string, number>();
    for (let i = 0; i < sanitized.length; i++) {
      const toks = tokenize(sanitized[i]);
      if (toks[0] === "POINT") {
        if (pointMemory.has(toks[1]))
          throw Error(`Duplicate label "${toks[1]}" at line ${i + 1}`);
        pointMemory.set(toks[1], i);
      }
    }

    const compiled: Instruction[] = [];

    const resolveLabel = (label: string, line: number): string => {
      const idx = pointMemory.get(label);
      if (idx === undefined)
        throw Error(`Undefined label: "${label}" at line ${line + 1}`);
      return idx.toString();
    };

    // Pass 3 — compile instructions
    for (let i = 0; i < sanitized.length; i++) {
      let toks = tokenize(sanitized[i]);
      const opcode = toks[0];

      const resolveAt = (tokenIdx: number) => {
        toks = [...toks];
        toks[tokenIdx] = resolveLabel(toks[tokenIdx], i);
      };

      let instruction: Instruction | null = null;

      switch (opcode) {
        // SET  <val>  >>  <dest>
        case "SET":
          instruction = buildInstruction(OpCode.SET, toks, i);
          break;
        // ADD  <a>  <b>  >>  <dest>
        case "ADD":
          instruction = buildInstruction(OpCode.ADD, toks, i);
          break;
        // SUB  <a>  <b>  >>  <dest>
        case "SUB":
          instruction = buildInstruction(OpCode.SUB, toks, i);
          break;
        // PRINT  <val>
        case "PRINT":
          instruction = buildInstruction(OpCode.PRINT, toks, i);
          break;

        // JUMP  <label>
        case "JUMP":
          resolveAt(1);
          instruction = buildInstruction(OpCode.JUMP, toks, i);
          break;
        // POINT  <label>
        case "POINT":
          resolveAt(1);
          instruction = buildInstruction(OpCode.POINT, toks, i);
          break;
        // CALL  <label>
        case "CALL":
          resolveAt(1);
          instruction = buildInstruction(OpCode.CALL, toks, i);
          break;
        // IF  <v1>  <op>  <v2>  >> <label>  [ELSE <label>]
        case "IF": {
          const arrowIdx = toks.indexOf(">>");
          if (arrowIdx === -1)
            throw Error(`IF requires a jump target at line ${i + 1}`);
          resolveAt(arrowIdx + 1);
          const elseIdx = toks.indexOf("ELSE");
          if (elseIdx !== -1) {
            if (elseIdx + 1 >= toks.length)
              throw Error(`Missing label after ELSE at line ${i + 1}`);
            resolveAt(elseIdx + 1);
          }
          instruction = buildInstruction(OpCode.IF, toks, i);
          assertComparison(instruction);
          break;
        }

        // MUL  <a>  <b>  >>  <dest>
        case "MUL":
          instruction = buildInstruction(OpCode.MUL, toks, i);
          break;
        // DIV  <a>  <b>  >>  <dest>
        case "DIV":
          instruction = buildInstruction(OpCode.DIV, toks, i);
          break;
        // MOD  <a>  <b>  >>  <dest>
        case "MOD":
          instruction = buildInstruction(OpCode.MOD, toks, i);
          break;
        // SQRT  <a>  >>  <dest>
        case "SQRT":
          instruction = buildInstruction(OpCode.SQRT, toks, i);
          break;
        // POW  <base>  <exp>  >>  <dest>
        case "POW":
          instruction = buildInstruction(OpCode.POW, toks, i);
          break;
        // ABS  <a>  >>  <dest>
        case "ABS":
          instruction = buildInstruction(OpCode.ABS, toks, i);
          break;
        // MIN  <a>  <b>  >>  <dest>
        case "MIN":
          instruction = buildInstruction(OpCode.MIN, toks, i);
          break;
        // MAX  <a>  <b>  >>  <dest>
        case "MAX":
          instruction = buildInstruction(OpCode.MAX, toks, i);
          break;
        // INC  <reg>
        case "INC":
          instruction = buildInstruction(OpCode.INC, toks, i);
          break;
        // DEC  <reg>
        case "DEC":
          instruction = buildInstruction(OpCode.DEC, toks, i);
          break;
        // RNG  <min>  <max>  >>  <dest>
        case "RNG":
          instruction = buildInstruction(OpCode.RNG, toks, i);
          break;

        // NOP
        case "NOP":
          instruction = buildInstruction(OpCode.NOP, toks, i);
          break;
        // HALT
        case "HALT":
          instruction = buildInstruction(OpCode.HALT, toks, i);
          break;
        // UNTIL  <cond>
        case "UNTIL":
          instruction = buildInstruction(OpCode.UNTIL, toks, i);
          assertComparison(instruction);
          break;
        // RET
        case "RET":
          instruction = buildInstruction(OpCode.RET, toks, i);
          break;

        // Custom peripheral or unknown opcode
        default:
          if (this.peripherals.has(opcode)) {
            instruction = buildInstruction(OpCode.PERIPHERAL, toks, i, opcode);
          } else {
            throw Error(`Unknown OpCode "${opcode}" at line ${i + 1}`);
          }
      }

      if (instruction) {
        compiled.push(instruction);
        yield instruction;
      }
    }

    // Atomic install — a failed compile never leaves a partial program
    this.instructions = compiled;
  }

  // -------------------------------------------------------------------
  // Execution
  // -------------------------------------------------------------------
  public *run() {
    if (this.runFastFlag) this.outputBuffer = [];
    while (this.activeInstructionPos < this.instructions.length) {
      let ipModified = false;
      if (!this.runFastFlag) this.outputBuffer = [];
      const instr = this.instructions[this.activeInstructionPos];

      switch (instr.operation) {
        // Store value into register
        case OpCode.SET:
          this.setMemory(this.fetchValue(instr.arguments[0]), instr.arguments[1]);
          break;
        // Output value to buffer
        case OpCode.PRINT:
          this.outputBuffer.push(this.fetchValue(instr.arguments[0]));
          break;
        // Add two values and store result
        case OpCode.ADD:
          this.setMemory(
            this.fetchMemory(instr.arguments[0]) + this.fetchMemory(instr.arguments[1]),
            instr.arguments[2],
          );
          break;
        // Subtract second from first and store result
        case OpCode.SUB:
          this.setMemory(
            this.fetchMemory(instr.arguments[0]) - this.fetchMemory(instr.arguments[1]),
            instr.arguments[2],
          );
          break;

        // Unconditional jump to label
        case OpCode.JUMP:
          this.activeInstructionPos = instr.arguments[0].value as number;
          ipModified = true;
          break;

        // Label marker - no operation, just a target for jumps
        case OpCode.POINT:
          break;

        // Conditional jump: IF v1 op v2 >> trueLabel [ELSE falseLabel]
        case OpCode.IF:
          if (evaluateIf(this, instr)) {
            this.activeInstructionPos = instr.arguments[3].value as number;
            ipModified = true;
          } else if (instr.arguments.length >= 5) {
            this.activeInstructionPos = instr.arguments[4].value as number;
            ipModified = true;
          }
          break;

        // Stop execution
        case OpCode.HALT:
          return;
        // No operation - does nothing
        case OpCode.NOP:
          break;

        // Multiply two values
        case OpCode.MUL:
          this.setMemory(
            this.fetchMemory(instr.arguments[0]) * this.fetchMemory(instr.arguments[1]),
            instr.arguments[2],
          );
          break;
        // Integer division — truncates toward zero
        case OpCode.DIV: {
          const divisor = this.fetchMemory(instr.arguments[1]);
          if (divisor === 0)
            throw Error(`Division by zero at line: ${this.activeInstructionPos + 1}`);
          this.setMemory(
            Math.trunc(this.fetchMemory(instr.arguments[0]) / divisor),
            instr.arguments[2],
          );
          break;
        }
        // Modulo — remainder keeps the dividend's sign (JS semantics)
        case OpCode.MOD: {
          const divisor = this.fetchMemory(instr.arguments[1]);
          if (divisor === 0)
            throw Error(`Modulo by zero at line: ${this.activeInstructionPos + 1}`);
          this.setMemory(
            this.fetchMemory(instr.arguments[0]) % divisor,
            instr.arguments[2],
          );
          break;
        }
        // Square root (integer)
        case OpCode.SQRT: {
          const val = this.fetchMemory(instr.arguments[0]);
          if (val < 0)
            throw Error(`SQRT of negative number at line: ${this.activeInstructionPos + 1}`);
          this.setMemory(Math.trunc(Math.sqrt(val)), instr.arguments[1]);
          break;
        }
        // Power (base^exponent)
        case OpCode.POW: {
          const result = Math.pow(
            this.fetchMemory(instr.arguments[0]),
            this.fetchMemory(instr.arguments[1]),
          );
          if (!isFinite(result))
            throw Error(`POW produced ${result} at line: ${this.activeInstructionPos + 1}`);
          this.setMemory(Math.trunc(result), instr.arguments[2]);
          break;
        }
        // Absolute value
        case OpCode.ABS:
          this.setMemory(
            Math.abs(this.fetchMemory(instr.arguments[0])),
            instr.arguments[1],
          );
          break;
        // Minimum of two values
        case OpCode.MIN:
          this.setMemory(
            Math.min(this.fetchMemory(instr.arguments[0]), this.fetchMemory(instr.arguments[1])),
            instr.arguments[2],
          );
          break;
        // Maximum of two values
        case OpCode.MAX:
          this.setMemory(
            Math.max(this.fetchMemory(instr.arguments[0]), this.fetchMemory(instr.arguments[1])),
            instr.arguments[2],
          );
          break;
        // Increment register in-place
        case OpCode.INC: {
          const arg = instr.arguments[0];
          this.setMemory(this.fetchMemory(arg) + 1, arg);
          break;
        }
        // Decrement register in-place
        case OpCode.DEC: {
          const arg = instr.arguments[0];
          this.setMemory(this.fetchMemory(arg) - 1, arg);
          break;
        }
        // Random integer in range [min, max]
        case OpCode.RNG: {
          const min = this.fetchMemory(instr.arguments[0]);
          const max = this.fetchMemory(instr.arguments[1]);
          if (min > max)
            throw Error(
              `RNG min (${min}) is greater than max (${max}) at line: ${this.activeInstructionPos + 1}`,
            );
          this.setMemory(
            Math.floor(Math.random() * (max - min + 1)) + min,
            instr.arguments[2],
          );
          break;
        }

        // Block until condition becomes true (yields each cycle)
        case OpCode.UNTIL:
          if (!evaluateIf(this, instr)) ipModified = true;
          break;

        // Call subroutine: push return address, jump to label
        case OpCode.CALL:
          this.pushCallStack(this.activeInstructionPos + 1);
          this.activeInstructionPos = instr.arguments[0].value as number;
          ipModified = true;
          break;

        // Return from subroutine: pop return address and jump back
        case OpCode.RET:
          this.activeInstructionPos = this.popCallStack();
          ipModified = true;
          break;

        // Dispatch to registered custom opcode handler
        case OpCode.PERIPHERAL: {
          const handler = this.peripherals.get(instr.peripheralName!);
          if (!handler)
            throw Error(`No handler registered for: "${instr.peripheralName}"`);
          handler(this, instr.arguments);
          break;
        }

        // Should never happen - unknown opcode
        default:
          throw Error(`Unknown OpCode: ${instr.operation}`);
      }

      if (!this.runFastFlag) yield;
      if (!ipModified) this.activeInstructionPos++;
    }
  }
}
