// basics
import { handleSet }   from "./handlers/basic/set";
import { handleAdd }   from "./handlers/basic/add";
import { handleSub }   from "./handlers/basic/sub";
import { handlePrint } from "./handlers/basic/print";

// control flow
import { handleIf } from "./handlers/control/if";
import {
  handleAbs, handleDiv, handleMax, handleMin,
  handleMul, handleMod, handlePow, handleSqrt,
  handleInc, handleDec, handleRng,
} from "./handlers/arithmetics";

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
  LITERAL    = 0,
  REGISTER   = 1,
  EQUAL      = 2,
  NOTEQUAL   = 3,
  LESS       = 4,
  GREATER    = 5,
  LESSEQUAL  = 6,
  GREATEQUAL = 7,
  LABEL      = 8,
  STRING     = 9,
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

export type RegValue =
  | { tag: "int";    data: number }
  | { tag: "string"; data: string };

export type PeripheralHandler = (vm: VM, args: Argument[]) => void;

// -------------------------------------------------------------------
// Internal helpers
// -------------------------------------------------------------------

function byteSize(v: RegValue): number {
  return v.tag === "int" ? 2 : v.data.length + 1;
}

/**
 * Tokenizer that keeps double-quoted strings as single tokens.
 *   SET "iron_ore" >> r0  →  ["SET", '"iron_ore"', ">>", "r0"]
 */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === " ") { i++; continue; }
    if (line[i] === '"') {
      let j = i + 1;
      while (j < line.length && line[j] !== '"') j++;
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
    return { type: ArgType.STRING,     value: arg.slice(1, -1) };
  if (arg.startsWith("r"))
    return { type: ArgType.REGISTER,   value: parseInt(arg.slice(1)) };
  if (arg === "==")  return { type: ArgType.EQUAL,      value: 0 };
  if (arg === "!=")  return { type: ArgType.NOTEQUAL,   value: 0 };
  if (arg === "<")   return { type: ArgType.LESS,        value: 0 };
  if (arg === ">")   return { type: ArgType.GREATER,    value: 0 };
  if (arg === "<=")  return { type: ArgType.LESSEQUAL,  value: 0 };
  if (arg === ">=")  return { type: ArgType.GREATEQUAL, value: 0 };
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
    if (tokens[i] !== ">>") argArr.push(parseArgument(tokens[i]));
  }
  return { operation, arguments: argArr, line, peripheralName };
}

// -------------------------------------------------------------------
// VM
// -------------------------------------------------------------------

export class VM {
  public outputBuffer: (number | string)[] = [];
  public instructions: Instruction[]       = [];
  public callStack: Int16Array;
  public stackPointer: number        = 0;
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
    this.callStackLimit      = callStackLimit;
    this.heapLimit           = heapLimit;
    this.registerMemory      = Array.from(
      { length: registerMemoryLimit },
      () => ({ tag: "int" as const, data: 0 }),
    );
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

  public heapAvailable(): number {
    return this.heapLimit - this.totalHeapUsed();
  }

  // -------------------------------------------------------------------
  // Memory access
  // -------------------------------------------------------------------

  public setMemory(data: number | string, dest: Argument): void {
    if (dest.type !== ArgType.REGISTER) {
      throw Error(
        dest.type === ArgType.LITERAL
          ? `Memory destination cannot be a LITERAL at line: ${this.activeInstructionPos + 1}`
          : `Illegal memory destination at line: ${this.activeInstructionPos + 1}`,
      );
    }

    const idx = dest.value as number;
    if (idx >= this.registerMemoryLimit || idx < 0) throw Error("Outside register memory bounds!");

    const newVal: RegValue = typeof data === "string"
      ? { tag: "string", data }
      : { tag: "int",    data };

    const delta = byteSize(newVal) - byteSize(this.registerMemory[idx]);
    if (this.totalHeapUsed() + delta > this.heapLimit) {
      throw Error(`Heap overflow! Need ${delta} more bytes but only ${this.heapAvailable()} available.`);
    }

    this.registerMemory[idx] = newVal;
  }

  /** Reads any value (number or string) from any argument type. */
  public fetchValue(arg: Argument): number | string {
    if (arg.type === ArgType.LITERAL)  return arg.value as number;
    if (arg.type === ArgType.STRING)   return arg.value as string;
    if (arg.type === ArgType.REGISTER) {
      const idx = arg.value as number;
      if (idx >= this.registerMemoryLimit || idx < 0) throw Error("Outside register memory bounds!");
      return this.registerMemory[idx].data;
    }
    throw Error(`Empty or illegal memory fetch at line: ${this.activeInstructionPos + 1}`);
  }

  /** Reads a number. Throws if the register holds a string. */
  public fetchMemory(arg: Argument): number {
    const v = this.fetchValue(arg);
    if (typeof v === "string") {
      throw Error(`Expected number but got string "${v}" at line: ${this.activeInstructionPos + 1}`);
    }
    return v;
  }

  // -------------------------------------------------------------------
  // Call stack
  // -------------------------------------------------------------------

  public pushCallStack(returnAddr: number): void {
    if (this.stackPointer >= this.callStackLimit) throw Error("Stack overflow!");
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
    this.registerMemory       = JSON.parse(parts[1]);

    this.callStack.fill(0);
    this.stackPointer = 0;
    if (parts[2]) {
      const vals = parts[2].split(",").map(Number);
      this.stackPointer = vals.length;
      vals.forEach((v, i) => this.callStack[i] = v);
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
    const vars        = new Map<string, string>();
    let   autoCounter = 0;
    const output: string[] = [];

    for (const line of source.split("\n")) {
      const trimmed = line.trimStart();
      const decl    = trimmed.match(/^\$(\w+)\s*=\s*(\S+)$/);

      if (decl) {
        const varName = `$${decl[1]}`;
        const target  = decl[2];
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
      const sorted = [...vars.entries()].sort((a, b) => b[0].length - a[0].length);
      for (const [name, reg] of sorted) resolved = resolved.replaceAll(name, reg);
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
      let toks     = tokenize(sanitized[i]);
      const opcode = toks[0];

      const resolveAt = (tokenIdx: number) => {
        toks = [...toks];
        toks[tokenIdx] = resolveLabel(toks[tokenIdx]);
      };

      let instruction: Instruction | null = null;

      switch (opcode) {
        case "SET":   instruction = buildInstruction(OpCode.SET,   toks, i); break;
        case "ADD":   instruction = buildInstruction(OpCode.ADD,   toks, i); break;
        case "SUB":   instruction = buildInstruction(OpCode.SUB,   toks, i); break;
        case "PRINT": instruction = buildInstruction(OpCode.PRINT, toks, i); break;

        case "JUMP":  resolveAt(1); instruction = buildInstruction(OpCode.JUMP,  toks, i); break;
        case "POINT": resolveAt(1); instruction = buildInstruction(OpCode.POINT, toks, i); break;
        case "CALL":  resolveAt(1); instruction = buildInstruction(OpCode.CALL,  toks, i); break;
        // IF <v1> <op> <v2> >> <label>  →  tokens[5] is the label
        case "IF":    resolveAt(5); instruction = buildInstruction(OpCode.IF,    toks, i); break;

        case "MUL":   instruction = buildInstruction(OpCode.MUL,   toks, i); break;
        case "DIV":   instruction = buildInstruction(OpCode.DIV,   toks, i); break;
        case "MOD":   instruction = buildInstruction(OpCode.MOD,   toks, i); break;
        case "SQRT":  instruction = buildInstruction(OpCode.SQRT,  toks, i); break;
        case "POW":   instruction = buildInstruction(OpCode.POW,   toks, i); break;
        case "ABS":   instruction = buildInstruction(OpCode.ABS,   toks, i); break;
        case "MIN":   instruction = buildInstruction(OpCode.MIN,   toks, i); break;
        case "MAX":   instruction = buildInstruction(OpCode.MAX,   toks, i); break;
        case "INC":   instruction = buildInstruction(OpCode.INC,   toks, i); break;
        case "DEC":   instruction = buildInstruction(OpCode.DEC,   toks, i); break;
        case "RNG":   instruction = buildInstruction(OpCode.RNG,   toks, i); break;

        case "NOP":   instruction = buildInstruction(OpCode.NOP,   toks, i); break;
        case "HALT":  instruction = buildInstruction(OpCode.HALT,  toks, i); break;
        case "UNTIL": instruction = buildInstruction(OpCode.UNTIL, toks, i); break;
        case "RET":   instruction = buildInstruction(OpCode.RET,   toks, i); break;

        default:
          if (this.peripherals.has(opcode)) {
            instruction = buildInstruction(OpCode.PERIPHERAL, toks, i, opcode);
          } else {
            console.warn(`Unknown OpCode "${opcode}" at line ${i} — skipped`);
            continue;
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
      this.outputBuffer  = [];
      const instr = this.instructions[this.activeInstructionPos];

      switch (instr.operation) {
        case OpCode.SET:   handleSet(this, instr);   break;
        case OpCode.PRINT: handlePrint(this, instr); break;
        case OpCode.ADD:   handleAdd(this, instr);   break;
        case OpCode.SUB:   handleSub(this, instr);   break;

        case OpCode.JUMP:
          this.activeInstructionPos = instr.arguments[0].value as number;
          ipModified = true;
          break;

        case OpCode.POINT:
          break;

        case OpCode.IF:
          if (handleIf(this, instr)) {
            this.activeInstructionPos = instr.arguments[3].value as number;
            ipModified = true;
          }
          break;

        case OpCode.HALT: return;
        case OpCode.NOP:  break;

        case OpCode.MUL:  handleMul(this, instr);  break;
        case OpCode.DIV:  handleDiv(this, instr);  break;
        case OpCode.MOD:  handleMod(this, instr);  break;
        case OpCode.SQRT: handleSqrt(this, instr); break;
        case OpCode.POW:  handlePow(this, instr);  break;
        case OpCode.ABS:  handleAbs(this, instr);  break;
        case OpCode.MIN:  handleMin(this, instr);  break;
        case OpCode.MAX:  handleMax(this, instr);  break;
        case OpCode.INC:  handleInc(this, instr);  break;
        case OpCode.DEC:  handleDec(this, instr);  break;
        case OpCode.RNG:  handleRng(this, instr);  break;

        case OpCode.UNTIL:
          if (!handleIf(this, instr)) ipModified = true;
          break;

        case OpCode.CALL:
          this.pushCallStack(this.activeInstructionPos + 1);
          this.activeInstructionPos = instr.arguments[0].value as number;
          ipModified = true;
          break;

        case OpCode.RET:
          this.activeInstructionPos = this.popCallStack();
          ipModified = true;
          break;

        case OpCode.PERIPHERAL: {
          const handler = this.peripherals.get(instr.peripheralName!);
          if (!handler) throw Error(`No handler registered for: "${instr.peripheralName}"`);
          handler(this, instr.arguments);
          break;
        }

        default:
          throw Error(`Unknown OpCode: ${instr.operation}`);
      }

      if (!this.runFastFlag) yield;
      if (!ipModified) this.activeInstructionPos++;
    }
  }
}