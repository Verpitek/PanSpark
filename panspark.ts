// basics
import { handleSet } from "./handlers/basic/set";
import { handleAdd } from "./handlers/basic/add";
import { handleSub } from "./handlers/basic/sub";
import { handlePrint } from "./handlers/basic/print";

// control flow
import { handleIf } from "./handlers/control/if";
import {
  handleAbs,
  handleDiv,
  handleMax,
  handleMin,
  handleMul,
  handleMod,
  handlePow,
  handleSqrt,
  handleInc,
  handleDec,
  handleRng,
} from "./handlers/arithmetics";

// arrays
import {
  handleArrNew,
  handleArrPush,
  handleArrPop,
  handleArrGet,
  handleArrSet,
  handleArrLen,
  handleArrSort,
} from "./handlers/arrays";

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

  ARR_NEW,
  ARR_PUSH,
  ARR_POP,
  ARR_GET,
  ARR_SET,
  ARR_LEN,
  ARR_SORT,

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
  LABEL = 8,
  STRING = 9,
  ARRAY = 10,
}

export interface Argument {
  type: ArgType;
  value: number | string | number[];
}

export interface Instruction {
  operation: OpCode;
  arguments: Argument[];
  line: number;
  peripheralName?: string;
}

export type RegValue =
  | { tag: "int"; data: number }
  | { tag: "string"; data: string }
  | { tag: "array"; data: number[] };

export type PeripheralHandler = (vm: VM, args: Argument[]) => void;

// -------------------------------------------------------------------
// Internal helpers
// -------------------------------------------------------------------

function byteSize(v: RegValue): number {
  if (v.tag === "int") return 2;
  if (v.tag === "string") return v.data.length + 1;
  return v.data.length * 2;
}

/**
 * Tokenizer that keeps double-quoted strings as single tokens.
 *   SET "iron_ore" >> r0  →  ["SET", '"iron_ore"', ">>", "r0"]
 */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === " ") {
      i++;
      continue;
    }
    if (line[i] === '"') {
      let j = i + 1;
      while (j < line.length && line[j] !== '"') j++;
      tokens.push(line.slice(i, j + 1));
      i = j + 1;
    } else if (line[i] === "[") {
      let j = i + 1;
      while (j < line.length && line[j] !== "]") j++;
      if (j >= line.length)
        throw Error(`Unclosed array literal in line: ${line}`);
      tokens.push(line.slice(i, j + 1));
      i = j + 1;
    } else {
      let j = i;
      while (j < line.length && line[j] !== " ") j++;
      tokens.push(line.slice(i, j));
      i = j;
    }
  }
  return tokens;
}

function parseArgument(arg: string): Argument {
  if (arg.startsWith('"') && arg.endsWith('"'))
    return { type: ArgType.STRING, value: arg.slice(1, -1) };
  if (arg.startsWith("[") && arg.endsWith("]")) {
    const inner = arg.slice(1, -1).trim();
    if (inner.length === 0)
      throw Error(`Empty array literal not allowed: ${arg}`);
    const elements = inner.split(",").map((s) => parseInt(s.trim()));
    if (elements.some(isNaN)) throw Error(`Invalid array literal: ${arg}`);
    return { type: ArgType.ARRAY, value: elements };
  }
  if (arg.startsWith("r"))
    return { type: ArgType.REGISTER, value: parseInt(arg.slice(1)) };
  if (arg === "==") return { type: ArgType.EQUAL, value: 0 };
  if (arg === "!=") return { type: ArgType.NOTEQUAL, value: 0 };
  if (arg === "<") return { type: ArgType.LESS, value: 0 };
  if (arg === ">") return { type: ArgType.GREATER, value: 0 };
  if (arg === "<=") return { type: ArgType.LESSEQUAL, value: 0 };
  if (arg === ">=") return { type: ArgType.GREATEQUAL, value: 0 };
  return { type: ArgType.LITERAL, value: parseInt(arg) };
}

function buildInstruction(
  operation: OpCode,
  tokens: string[],
  line: number,
  peripheralName?: string,
): Instruction {
  const argArr: Argument[] = [];
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] !== ">>" && tokens[i] !== "ELSE")
      argArr.push(parseArgument(tokens[i]));
  }
  return { operation, arguments: argArr, line, peripheralName };
}

// -------------------------------------------------------------------
// VM
// -------------------------------------------------------------------

export class VM {
  public outputBuffer: (number | string)[] = [];
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
   * @param registerMemoryLimit  Number of r-registers  (e.g. 8 → r0–r7)
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
    this.registerMemory = Array.from({ length: registerMemoryLimit }, () => ({
      tag: "int" as const,
      data: 0,
    }));
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

  public setMemory(data: number | string | number[], dest: Argument): void {
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

    const newVal: RegValue =
      typeof data === "string"
        ? { tag: "string", data }
        : Array.isArray(data)
          ? { tag: "array", data }
          : { tag: "int", data };

    const delta = byteSize(newVal) - byteSize(this.registerMemory[idx]);
    if (this.totalHeapUsed() + delta > this.heapLimit) {
      throw Error(
        `Heap overflow! Need ${delta} more bytes but only ${this.heapAvailable()} available.`,
      );
    }

    this.registerMemory[idx] = newVal;
  }

  /** Reads any value (number, string, or array) from any argument type. */
  public fetchValue(arg: Argument): number | string | number[] {
    if (arg.type === ArgType.LITERAL) return arg.value as number;
    if (arg.type === ArgType.STRING) return arg.value as string;
    if (arg.type === ArgType.ARRAY) return arg.value as number[];
    if (arg.type === ArgType.REGISTER) {
      const idx = arg.value as number;
      if (idx >= this.registerMemoryLimit || idx < 0)
        throw Error("Outside register memory bounds!");
      return this.registerMemory[idx].data;
    }
    throw Error(
      `Empty or illegal memory fetch at line: ${this.activeInstructionPos + 1}`,
    );
  }

  /** Reads a number. Throws if the register holds a string or array. */
  public fetchMemory(arg: Argument): number {
    const v = this.fetchValue(arg);
    if (typeof v === "string") {
      throw Error(
        `Expected number but got string "${v}" at line: ${this.activeInstructionPos + 1}`,
      );
    }
    if (Array.isArray(v)) {
      throw Error(
        `Expected number but got array at line: ${this.activeInstructionPos + 1}`,
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

  /** Format: ip|registers_json|callstack|output_json|instructions_json */
  public saveState(): string {
    return [
      this.activeInstructionPos,
      JSON.stringify(this.registerMemory),
      Array.from(this.callStack.slice(0, this.stackPointer)).join(","),
      JSON.stringify(this.outputBuffer),
      JSON.stringify(this.instructions),
    ].join("|");
  }

  public loadState(state: string): void {
    const parts: string[] = [];
    let remaining = state;
    for (let i = 0; i < 4; i++) {
      const idx = remaining.indexOf("|");
      if (idx === -1) throw Error("Invalid savestate format");
      parts.push(remaining.slice(0, idx));
      remaining = remaining.slice(idx + 1);
    }
    parts.push(remaining);
    if (parts.length !== 5) throw Error("Invalid savestate format");

    this.activeInstructionPos = parseInt(parts[0]);
    this.registerMemory = JSON.parse(parts[1]);

    this.callStack.fill(0);
    this.stackPointer = 0;
    if (parts[2]) {
      const vals = parts[2].split(",").map(Number);
      this.stackPointer = vals.length;
      vals.forEach((v, i) => (this.callStack[i] = v));
    }

    this.outputBuffer = JSON.parse(parts[3]);
    this.instructions = JSON.parse(parts[4]);
  }

  // -------------------------------------------------------------------
  // Compiler  (precompiler pass runs first, internally)
  // -------------------------------------------------------------------

  /**
   * Pass 0 — resolve $name declarations.
   *
   *   $name = r2     explicit register
   *   $name = auto   next available register
   *
   * Declaration lines are stripped. All $name occurrences in remaining
   * lines are replaced with their register string. Longest names are
   * substituted first to avoid partial-match bugs ($foobar before $foo).
   */
  private resolveVariables(source: string): string {
    const vars = new Map<string, string>();
    let autoCounter = 0;
    const output: string[] = [];

    for (const line of source.split("\n")) {
      const trimmed = line.trimStart();
      const decl = trimmed.match(/^\$(\w+)\s*=\s*(\S+)$/);

      if (decl) {
        const varName = `$${decl[1]}`;
        const target = decl[2];
        if (target === "auto") {
          vars.set(varName, `r${autoCounter++}`);
        } else {
          vars.set(varName, target);
          if (target.startsWith("r")) {
            const idx = parseInt(target.slice(1));
            if (!isNaN(idx) && idx >= autoCounter) autoCounter = idx + 1;
          }
        }
        continue; // strip declaration
      }

      let resolved = trimmed;
      // longest names first to prevent partial matches
      const sorted = [...vars.entries()].sort(
        (a, b) => b[0].length - a[0].length,
      );
      for (const [name, reg] of sorted)
        resolved = resolved.replaceAll(name, reg);
      output.push(resolved);
    }

    return output.join("\n");
  }

  public *compile(source: string) {
    // Pass 0 — variable substitution
    const code = this.resolveVariables(source);

    // Pass 1 — strip blanks and comments
    const sanitized: string[] = [];
    for (const raw of code.split("\n")) {
      const trimmed = raw.trimStart();
      if (!trimmed || trimmed.startsWith("//")) continue;
      sanitized.push(trimmed);
    }

    // Pass 2 — collect POINT labels → instruction index
    const pointMemory = new Map<string, number>();
    for (let i = 0; i < sanitized.length; i++) {
      const toks = tokenize(sanitized[i]);
      if (toks[0] === "POINT") pointMemory.set(toks[1], i);
    }

    const resolveLabel = (label: string): string => {
      const idx = pointMemory.get(label);
      if (idx === undefined) throw Error(`Undefined label: "${label}"`);
      return idx.toString();
    };

    // Pass 3 — compile
    for (let i = 0; i < sanitized.length; i++) {
      let toks = tokenize(sanitized[i]);
      const opcode = toks[0];

      const resolveAt = (tokenIdx: number) => {
        toks = [...toks];
        toks[tokenIdx] = resolveLabel(toks[tokenIdx]);
      };

      let instruction: Instruction | null = null;

      switch (opcode) {
        // SET <val> >> <dest>
        case "SET":
          instruction = buildInstruction(OpCode.SET, toks, i);
          break;
        // ADD <a> <b> >> <dest>
        case "ADD":
          instruction = buildInstruction(OpCode.ADD, toks, i);
          break;
        // SUB <a> <b> >> <dest>
        case "SUB":
          instruction = buildInstruction(OpCode.SUB, toks, i);
          break;
        // PRINT <val>
        case "PRINT":
          instruction = buildInstruction(OpCode.PRINT, toks, i);
          break;

        // JUMP <label>
        case "JUMP":
          resolveAt(1);
          instruction = buildInstruction(OpCode.JUMP, toks, i);
          break;
        // POINT <label>
        case "POINT":
          resolveAt(1);
          instruction = buildInstruction(OpCode.POINT, toks, i);
          break;
        // CALL <label>
        case "CALL":
          resolveAt(1);
          instruction = buildInstruction(OpCode.CALL, toks, i);
          break;
        // IF <v1> <op> <v2> >> <label>  →  tokens[5] is the label
        // IF <v1> <op> <v2> >> <label_true> ELSE <label_false> → tokens[5]=true, tokens[7]=false
        case "IF":
          resolveAt(5);
          if (toks[6] === "ELSE") {
            if (toks.length < 8)
              throw Error(`Missing label after ELSE at line ${i}`);
            resolveAt(7);
            // Remove "ELSE" token so buildInstruction doesn't see it
            toks = toks.filter((_, idx) => idx !== 6);
          }
          instruction = buildInstruction(OpCode.IF, toks, i);
          break;

        // MUL <a> <b> >> <dest>
        case "MUL":
          instruction = buildInstruction(OpCode.MUL, toks, i);
          break;
        // DIV <a> <b> >> <dest>
        case "DIV":
          instruction = buildInstruction(OpCode.DIV, toks, i);
          break;
        // MOD <a> <b> >> <dest>
        case "MOD":
          instruction = buildInstruction(OpCode.MOD, toks, i);
          break;
        // SQRT <a> >> <dest>
        case "SQRT":
          instruction = buildInstruction(OpCode.SQRT, toks, i);
          break;
        // POW <base> <exp> >> <dest>
        case "POW":
          instruction = buildInstruction(OpCode.POW, toks, i);
          break;
        // ABS <a> >> <dest>
        case "ABS":
          instruction = buildInstruction(OpCode.ABS, toks, i);
          break;
        // MIN <a> <b> >> <dest>
        case "MIN":
          instruction = buildInstruction(OpCode.MIN, toks, i);
          break;
        // MAX <a> <b> >> <dest>
        case "MAX":
          instruction = buildInstruction(OpCode.MAX, toks, i);
          break;
        // INC <reg>
        case "INC":
          instruction = buildInstruction(OpCode.INC, toks, i);
          break;
        // DEC <reg>
        case "DEC":
          instruction = buildInstruction(OpCode.DEC, toks, i);
          break;
        // RNG <min> <max> >> <dest>
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
        // UNTIL <cond>
        case "UNTIL":
          instruction = buildInstruction(OpCode.UNTIL, toks, i);
          break;
        // RET
        case "RET":
          instruction = buildInstruction(OpCode.RET, toks, i);
          break;

        // ARR_NEW <size> >> <dest>
        case "ARR_NEW":
          instruction = buildInstruction(OpCode.ARR_NEW, toks, i);
          break;
        // ARR_PUSH <arr> <val>
        case "ARR_PUSH":
          instruction = buildInstruction(OpCode.ARR_PUSH, toks, i);
          break;
        // ARR_POP <arr> >> <dest>
        case "ARR_POP":
          instruction = buildInstruction(OpCode.ARR_POP, toks, i);
          break;
        // ARR_GET <arr> <idx> >> <dest>
        case "ARR_GET":
          instruction = buildInstruction(OpCode.ARR_GET, toks, i);
          break;
        // ARR_SET <arr> <idx> <val>
        case "ARR_SET":
          instruction = buildInstruction(OpCode.ARR_SET, toks, i);
          break;
        // ARR_LEN <arr> >> <dest>
        case "ARR_LEN":
          instruction = buildInstruction(OpCode.ARR_LEN, toks, i);
          break;
        // ARR_SORT <arr>
        case "ARR_SORT":
          instruction = buildInstruction(OpCode.ARR_SORT, toks, i);
          break;

        // Custom peripheral or unknown opcode
        default:
          if (this.peripherals.has(opcode)) {
            instruction = buildInstruction(OpCode.PERIPHERAL, toks, i, opcode);
          } else {
            throw Error(`Unknown OpCode "${opcode}" at line ${i}`);
          }
      }

      this.instructions.push(instruction);
      yield instruction;
    }
  }

  // -------------------------------------------------------------------
  // Execution
  // -------------------------------------------------------------------

  public *run() {
    while (this.activeInstructionPos < this.instructions.length) {
      let ipModified = false;
      this.outputBuffer = [];
      const instr = this.instructions[this.activeInstructionPos];

      switch (instr.operation) {
        // Store value into register
        case OpCode.SET:
          handleSet(this, instr);
          break;
        // Output value to buffer
        case OpCode.PRINT:
          handlePrint(this, instr);
          break;
        // Add two values and store result
        case OpCode.ADD:
          handleAdd(this, instr);
          break;
        // Subtract second from first and store result
        case OpCode.SUB:
          handleSub(this, instr);
          break;

        // Unconditional jump to label
        case OpCode.JUMP:
          this.activeInstructionPos = instr.arguments[0].value as number;
          ipModified = true;
          break;

        // Label marker - no operation, just a target for jumps
        case OpCode.POINT:
          break;

        // Conditional jump: if true -> arg3 (label_true), else if arg4 exists -> arg4 (label_false)
        case OpCode.IF:
          if (handleIf(this, instr)) {
            this.activeInstructionPos = instr.arguments[3].value as number;
            ipModified = true;
          } else if (instr.arguments[4]) {
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
          handleMul(this, instr);
          break;
        // Integer division
        case OpCode.DIV:
          handleDiv(this, instr);
          break;
        // Modulo operation
        case OpCode.MOD:
          handleMod(this, instr);
          break;
        // Square root (integer)
        case OpCode.SQRT:
          handleSqrt(this, instr);
          break;
        // Power (base^exponent)
        case OpCode.POW:
          handlePow(this, instr);
          break;
        // Absolute value
        case OpCode.ABS:
          handleAbs(this, instr);
          break;
        // Minimum of two values
        case OpCode.MIN:
          handleMin(this, instr);
          break;
        // Maximum of two values
        case OpCode.MAX:
          handleMax(this, instr);
          break;
        // Increment register in-place
        case OpCode.INC:
          handleInc(this, instr);
          break;
        // Decrement register in-place
        case OpCode.DEC:
          handleDec(this, instr);
          break;
        // Random integer in range [min, max]
        case OpCode.RNG:
          handleRng(this, instr);
          break;

        // Block until condition becomes true (yields each cycle)
        case OpCode.UNTIL:
          if (!handleIf(this, instr)) ipModified = true;
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

        // ARR_NEW <size> >> <dest>
        case OpCode.ARR_NEW:
          handleArrNew(this, instr);
          break;
        // ARR_PUSH <arr> <val>
        case OpCode.ARR_PUSH:
          handleArrPush(this, instr);
          break;
        // ARR_POP <arr> >> <dest>
        case OpCode.ARR_POP:
          handleArrPop(this, instr);
          break;
        // ARR_GET <arr> <idx> >> <dest>
        case OpCode.ARR_GET:
          handleArrGet(this, instr);
          break;
        // ARR_SET <arr> <idx> <val>
        case OpCode.ARR_SET:
          handleArrSet(this, instr);
          break;
        // ARR_LEN <arr> >> <dest>
        case OpCode.ARR_LEN:
          handleArrLen(this, instr);
          break;
        // ARR_SORT <arr>
        case OpCode.ARR_SORT:
          handleArrSort(this, instr);
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
