import { handleSet } from "./handlers/set";
import { handlePrint } from "./handlers/print";
import { handleAdd } from "./handlers/add";

export enum OpCode {
  // basics
  SET,
  ADD,
  SUB,
  PRINT,

  // control flow
  JUMP,
  JEQU,
  JNEQ,
  JLSS,
  JGTR,
  JLSE,
  JGRE,

  // logical operations
  AND,
  OR,
  XOR,

  // memory access
  LOAD,
  STORE,

  // arithmetic extensions
  MUL,
  DIV,
  MOD,
  SQR,
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
  private registerMemory: number[] = [];
  private machineMemory: number[] = [];
  private activeLine = 0;

  public setMemory(data: number, dest: Argument) {
    if (dest.type == ArgType.LITERAL) {
      throw Error("memory destination cannot be a LITERAL");
    }
    if (dest.type == ArgType.REGISTER) {
      this.registerMemory[dest.value] = data;
    }
    if (dest.type == ArgType.MEMORY) {
      this.machineMemory[dest.value] = data;
    }
  }

  public fetchMemory(arg: Argument): number {
    if (arg.type == ArgType.LITERAL) {
      throw Error("cannot fetch memory from a LITERAL");
    }
    if (arg.type == ArgType.REGISTER) {
      return this.registerMemory[arg.value];
    }
    if (arg.type == ArgType.MEMORY) {
      return this.machineMemory[arg.value];
    } else {
      return 0;
    }
  }

  public *compile(code: string) {
    const splitCode = code.split("\n");
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
            splitCode[line],
            parseInt(line),
          );
          break;
        case "JEQU":
          instruction = buildInstruction(
            OpCode.JEQU,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "JNEQ":
          instruction = buildInstruction(
            OpCode.JNEQ,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "JLSS":
          instruction = buildInstruction(
            OpCode.JLSS,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "JGTR":
          instruction = buildInstruction(
            OpCode.JGTR,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "JLSE":
          instruction = buildInstruction(
            OpCode.JLSE,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "JGRE":
          instruction = buildInstruction(
            OpCode.JGRE,
            splitCode[line],
            parseInt(line),
          );
          break;

        // Logical Operations
        case "AND":
          instruction = buildInstruction(
            OpCode.AND,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "OR":
          instruction = buildInstruction(
            OpCode.OR,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "XOR":
          instruction = buildInstruction(
            OpCode.XOR,
            splitCode[line],
            parseInt(line),
          );
          break;

        // Memory Access
        case "LOAD":
          instruction = buildInstruction(
            OpCode.LOAD,
            splitCode[line],
            parseInt(line),
          );
          break;
        case "STORE":
          instruction = buildInstruction(
            OpCode.STORE,
            splitCode[line],
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
        case "SQR":
          instruction = buildInstruction(
            OpCode.SQR,
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

  public run() {
    for (let line in this.instructions) {
      const parsedInstruction = this.instructions[line];
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
        default:
          break;
      }
    }
  }
}
