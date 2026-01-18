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

export enum OpCode {
  // basics
  SET,
  ADD,
  SUB,
  PRINT,

  // control flow
  JUMP,
  POINT,
  IF,

  // arithmetic extensions
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

  // utility
  NOP,
  HALT,
  UNTIL,
  CALL, // not implemented
  RET, // not implemented
}

export enum ArgType {
  LITERAL = 0,
  REGISTER = 1,
  MEMORY = 2,
  EQUAL = 3,
  NOTEQUAL = 4,
  LESS = 5,
  GREATER = 6,
  LESSEQUAL = 7,
  GREATEQUAL = 8,
  LABEL = 9,
  HEAP = 10,
}

export interface Argument {
  type: ArgType;
  value: number;
}

export interface Instruction {
  operation: OpCode;
  arguments: Argument[];
  line: number;
}

function parseArgument(arg: string): Argument {
  if (arg.startsWith("r")) {
    return { type: ArgType.REGISTER, value: parseInt(arg.slice(1)) };
  } else if (arg.startsWith("x")) {
    return { type: ArgType.MEMORY, value: parseInt(arg.slice(1)) };
  } else if (arg == "==") {
    return { type: ArgType.EQUAL, value: 0 };
  } else if (arg == "!=") {
    return { type: ArgType.NOTEQUAL, value: 0 };
  } else if (arg == "<") {
    return { type: ArgType.LESS, value: 0 };
  } else if (arg == ">") {
    return { type: ArgType.GREATER, value: 0 };
  } else if (arg == "<=") {
    return { type: ArgType.LESSEQUAL, value: 0 };
  } else if (arg == ">=") {
    return { type: ArgType.GREATEQUAL, value: 0 };
  } else {
    return { type: ArgType.LITERAL, value: parseInt(arg) };
  }
}

function buildInstruction(
  operation: OpCode,
  argumentString: string,
  line: number,
): Instruction {
  const splitArguments = argumentString.split(" ").splice(1);
  let argArr: Argument[] = [];
  for (let arg of splitArguments) {
    if (arg != ">>") {
      argArr.push(parseArgument(arg));
    }
  }
  return { operation, arguments: argArr, line };
}

export class VM {
  public outputBuffer: number[] = [];
  public instructions: Instruction[] = [];
  public callStack: number[] = [];
  public activeInstructionPos: number = 0;

  public registerMemoryLimit: number = 0;
  public machineMemoryLimit: number = 0;
  public callStackLimit: number = 0;
  public registerMemory: number[] = [];
  public machineMemory: number[] = [];

  public runFastFlag: boolean = false;

  constructor(
    registerMemoryLimit: number,
    machineMemoryLimit: number,
    callStackLimit: number,
  ) {
    this.registerMemoryLimit = registerMemoryLimit;
    this.machineMemoryLimit = machineMemoryLimit;
    this.callStackLimit = callStackLimit;
    this.registerMemory = new Array(this.registerMemoryLimit).fill(0);
    this.machineMemory = new Array(this.machineMemoryLimit).fill(0);
  }

  /**
   * Saves the current VM state to a compact string format.
   * Format: instructionPos|r0,r1,r2,...|x0,x1,x2,...|output0,output1,...|instructions(JSON)
   * @returns Compressed state string
   */
  public saveState(): string {
    // Save instruction pointer
    const ipPart = this.activeInstructionPos.toString();

    // Save register memory (omit trailing zeros for space efficiency)
    const regPart = this.registerMemory
      .slice(0, this.findLastNonZeroIndex(this.registerMemory) + 1)
      .join(",");

    // Save machine memory (omit trailing zeros for space efficiency)
    const memPart = this.machineMemory
      .slice(0, this.findLastNonZeroIndex(this.machineMemory) + 1)
      .join(",");

    const callPart = this.callStack.join(",");

    // Save output buffer
    const outputPart = this.outputBuffer.join(",");

    // Save instructions (compiled code)
    const instructionsPart = JSON.stringify(this.instructions);

    return `${ipPart}|${regPart}|${memPart}|${callPart}|${outputPart}|${instructionsPart}`;
  }

  /**
   * Restores the VM state from a savestate string.
   * @param state Savestate string from saveState()
   */
  public loadState(state: string): void {
    // Find the first 3 pipes to split the first 4 parts
    let pipeCount = 0;
    let splitIndex = 0;
    for (let i = 0; i < state.length && pipeCount < 5; i++) {
      if (state[i] === "|") {
        pipeCount++;
        if (pipeCount === 5) {
          splitIndex = i;
          break;
        }
      }
    }

    const parts = state.substring(0, splitIndex).split("|");
    const instructionsJson = state.substring(splitIndex + 1);

    if (parts.length < 4) {
      throw Error("Invalid savestate format");
    }

    // Restore instruction pointer
    this.activeInstructionPos = parseInt(parts[0]);

    // Restore register memory
    this.registerMemory = [];
    if (parts[1]) {
      const regValues = parts[1].split(",").map((v) => parseInt(v));
      for (let i = 0; i < regValues.length; i++) {
        this.registerMemory[i] = regValues[i];
      }
    }
    // Fill remaining registers with 0
    for (
      let i = this.registerMemory.length;
      i < this.registerMemoryLimit;
      i++
    ) {
      this.registerMemory[i] = 0;
    }

    // Restore machine memory
    this.machineMemory = [];
    if (parts[2]) {
      const memValues = parts[2].split(",").map((v) => parseInt(v));
      for (let i = 0; i < memValues.length; i++) {
        this.machineMemory[i] = memValues[i];
      }
    }
    // Fill remaining memory with 0
    for (let i = this.machineMemory.length; i < this.machineMemoryLimit; i++) {
      this.machineMemory[i] = 0;
    }

    this.callStack = [];
    if (parts[3]) {
      const calValues = parts[3].split(",").map((v) => parseInt(v));
      for (let i = 0; i < calValues.length; i++) {
        this.callStack[i] = calValues[i];
      }
    }

    // Restore output buffer
    this.outputBuffer = [];
    if (parts[4]) {
      this.outputBuffer = parts[4].split(",").map((v) => parseInt(v));
    }

    // Restore instructions
    if (instructionsJson) {
      this.instructions = JSON.parse(instructionsJson);
    }
  }

  /**
   * Helper function to find the index of the last non-zero value in an array
   * @param arr Array to search
   * @returns Index of last non-zero, or -1 if all zeros
   */
  private findLastNonZeroIndex(arr: number[]): number {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] !== 0 && arr[i] !== undefined) {
        return i;
      }
    }
    return -1;
  }

  public setMemory(data: number, dest: Argument) {
    if (dest.type == ArgType.LITERAL) {
      throw Error(
        "memory destination cannot be a LITERAL! at line: " +
          (this.activeInstructionPos + 1),
      );
    } else if (dest.type == ArgType.REGISTER) {
      if (dest.value >= this.registerMemoryLimit || dest.value < 0) {
        throw Error("outside register memory bounds!");
      }
      this.registerMemory[dest.value] = data;
    } else if (dest.type == ArgType.MEMORY) {
      if (dest.value >= this.machineMemoryLimit || dest.value < 0) {
        throw Error("outside machine memory bounds!");
      }
      this.machineMemory[dest.value] = data;
    } else {
      throw Error(
        "illegal operation! at line: " + (this.activeInstructionPos + 1),
      );
    }
  }

  public fetchMemory(arg: Argument): number {
    if (arg.type == ArgType.LITERAL) {
      return arg.value;
    } else if (arg.type == ArgType.REGISTER) {
      if (arg.value >= this.registerMemoryLimit || arg.value < 0) {
        throw Error("outside register memory bounds!");
      }
      return this.registerMemory[arg.value];
    } else if (arg.type == ArgType.MEMORY) {
      if (arg.value >= this.machineMemoryLimit || arg.value < 0) {
        throw Error("outside machine memory bounds!");
      }
      return this.machineMemory[arg.value];
    } else {
      throw Error(
        "empty or illegal memory fetch! at line: " +
          (this.activeInstructionPos + 1),
      );
    }
  }

  public pushCallStack(returnAddr: number) {
    if (this.callStack.length >= this.callStackLimit) {
      throw Error("Stack overflow! Too many nested calls.");
    }
    this.callStack.push(returnAddr);
  }

  public popCallStack(): number {
    if (this.callStack.length === 0) {
      throw Error("Stack underflow!");
    }
    return this.callStack.pop()!;
  }

  public *compile(code: string) {
    let splitCode = code.split("\n");
    let sanitizedCode: string[] = [];
    // first pass: sanitization
    for (let line in splitCode) {
      const opcode = splitCode[line].split(" ")[0];
      if (opcode == "" || opcode.startsWith("//")) {
        continue;
      } else {
        sanitizedCode.push(splitCode[line]);
      }
    }
    splitCode = sanitizedCode;
    let pointMemory: Map<string, number> = new Map();
    // second pass: point collection
    for (let line in splitCode) {
      const operation = splitCode[line].split(" ");
      const opcode = operation[0];
      if (opcode == "POINT") {
        pointMemory[operation[1]] = line;
      }
    }
    // third pass: compilation
    for (let line in splitCode) {
      let instruction: Instruction | null = null;
      const opcode = splitCode[line].split(" ")[0];
      switch (opcode) {
        case "SET":
          instruction = buildInstruction(
            OpCode.SET,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "ADD":
          instruction = buildInstruction(
            OpCode.ADD,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "SUB":
          instruction = buildInstruction(
            OpCode.SUB,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "PRINT":
          instruction = buildInstruction(
            OpCode.PRINT,
            splitCode[line],
            parseInt(line),
          );
          break;

        // Control Flow
        case "JUMP":
          instruction = buildInstruction(
            OpCode.JUMP,
            splitCode[line].replace(
              splitCode[line].split(" ")[1],
              pointMemory[splitCode[line].split(" ")[1]],
            ),
            parseInt(line),
          );
          break;
        case "POINT":
          instruction = buildInstruction(
            OpCode.POINT,
            splitCode[line].replace(
              splitCode[line].split(" ")[1],
              pointMemory[splitCode[line].split(" ")[1]],
            ),
            parseInt(line),
          );
          break;
        case "IF":
          instruction = buildInstruction(
            OpCode.IF,
            splitCode[line].replace(
              splitCode[line].split(" ")[5],
              pointMemory[splitCode[line].split(" ")[5]],
            ),
            parseInt(line),
          );
          break;

        // Arithmetic Extensions
        case "MUL":
          instruction = buildInstruction(
            OpCode.MUL,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "DIV":
          instruction = buildInstruction(
            OpCode.DIV,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "MOD":
          instruction = buildInstruction(
            OpCode.MOD,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "SQRT":
          instruction = buildInstruction(
            OpCode.SQRT,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "POW":
          instruction = buildInstruction(
            OpCode.POW,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "ABS":
          instruction = buildInstruction(
            OpCode.ABS,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "MIN":
          instruction = buildInstruction(
            OpCode.MIN,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "MAX":
          instruction = buildInstruction(
            OpCode.MAX,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "INC":
          instruction = buildInstruction(
            OpCode.INC,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "DEC":
          instruction = buildInstruction(
            OpCode.DEC,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "RNG":
          instruction = buildInstruction(
            OpCode.RNG,
            splitCode[line],
            parseInt(line),
          );
          break;

        // Utility
        case "NOP":
          instruction = buildInstruction(
            OpCode.NOP,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "HALT":
          instruction = buildInstruction(
            OpCode.HALT,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "UNTIL":
          instruction = buildInstruction(
            OpCode.UNTIL,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "CALL":
          instruction = buildInstruction(
            OpCode.CALL,
            splitCode[line].replace(
              splitCode[line].split(" ")[1],
              pointMemory[splitCode[line].split(" ")[1]],
            ),
            parseInt(line),
          );
          break;
        case "RET":
          instruction = buildInstruction(
            OpCode.RET,
            splitCode[line],
            parseInt(line),
          );
          break;
        default:
          console.log("unknown OpCode: " + opcode);
          continue;
      }
      this.instructions.push(instruction);
      yield instruction;
    }
  }

  public *run() {
    while (this.activeInstructionPos < this.instructions.length) {
      let instructionPointerModified: boolean = false;
      this.outputBuffer = [];
      const parsedInstruction = this.instructions[this.activeInstructionPos];
      switch (parsedInstruction.operation) {
        case OpCode.SET:
          handleSet(this, parsedInstruction);
          break;
        case OpCode.PRINT:
          handlePrint(this, parsedInstruction);
          break;
        case OpCode.ADD:
          handleAdd(this, parsedInstruction);
          break;
        case OpCode.SUB:
          handleSub(this, parsedInstruction);
          break;
        case OpCode.JUMP:
          this.activeInstructionPos = parsedInstruction.arguments[0].value;
          instructionPointerModified = true;
          break;
        case OpCode.POINT:
          break;
        case OpCode.IF:
          const ifCondition = handleIf(this, parsedInstruction);
          if (ifCondition == true) {
            this.activeInstructionPos = parsedInstruction.arguments[3].value;
            instructionPointerModified = true;
          }
          break;
        case OpCode.HALT:
          return;
        case OpCode.NOP:
          break;
        case OpCode.MUL:
          handleMul(this, parsedInstruction);
          break;
        case OpCode.DIV:
          handleDiv(this, parsedInstruction);
          break;
        case OpCode.MOD:
          handleMod(this, parsedInstruction);
          break;
        case OpCode.SQRT:
          handleSqrt(this, parsedInstruction);
          break;
        case OpCode.POW:
          handlePow(this, parsedInstruction);
          break;
        case OpCode.ABS:
          handleAbs(this, parsedInstruction);
          break;
        case OpCode.MIN:
          handleMin(this, parsedInstruction);
          break;
        case OpCode.MAX:
          handleMax(this, parsedInstruction);
          break;
        case OpCode.INC:
          handleInc(this, parsedInstruction);
          break;
        case OpCode.DEC:
          handleDec(this, parsedInstruction);
          break;
        case OpCode.RNG:
          handleRng(this, parsedInstruction);
          break;
        case OpCode.UNTIL:
          const untilCondition = handleIf(this, parsedInstruction);
          if (untilCondition != true) {
            instructionPointerModified = true;
          }
          break;
        case OpCode.CALL:
          this.pushCallStack(this.activeInstructionPos + 1);
          this.activeInstructionPos = parsedInstruction.arguments[0].value;
          instructionPointerModified = true;
          break;
        case OpCode.RET:
          this.activeInstructionPos = this.popCallStack();
          instructionPointerModified = true;
          break;
        default:
          throw Error("Unknown OpCode: " + parsedInstruction.operation);
      }
      if (!this.runFastFlag) {
        yield;
      }
      if (!instructionPointerModified) {
        this.activeInstructionPos++;
      }
    }
  }
}
