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

  // utility
  NOP,
  HALT,
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
  public activeInstructionPos: number = 0;

  public registerMemoryLimit: number = 0;
  public machineMemoryLimit: number = 0;
  public registerMemory: number[] = [];
  public machineMemory: number[] = [];

  constructor(registerMemoryLimit: number, machineMemoryLimit: number) {
    this.registerMemoryLimit = registerMemoryLimit;
    this.machineMemoryLimit = machineMemoryLimit;
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
      yield;
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
      yield;
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
          const condition = handleIf(this, parsedInstruction);
          if (condition == true) {
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
        default:
          throw Error("Unknown OpCode: " + parsedInstruction.operation);
      }
      yield;
      if (!instructionPointerModified) {
        this.activeInstructionPos++;
      }
    }
  }
}
