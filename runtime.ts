export let variableMemory: Map<string, number> = new Map();
export let jumpPoints: Map<string, number> = new Map();

export let memory: Map<string, number>[] = [variableMemory];

export let buffer: string[] = [];

enum OpCode {
  SET,
  MATH,
  PRINT,
  IF,
  JUMP,
  POINT,
  END,
  MEMWIPE,
  MEMDUMP,
  RETURN,
  SCOPE,
  SCOPE_END,
}

interface Instruction {
  operation: OpCode;
  args: string[];
  line: number;
}

function variableCheck(
  variableName: string,
  line: number,
  scopeLevel: number,
): number {
  let scopeMap = memory[scopeLevel];
  let variable: number | undefined;
  if (scopeMap === undefined) {
    memory[scopeLevel] = new Map<string, number>();
  } else {
    variable = scopeMap.get(variableName);
  }

  if (variable !== undefined) {
    return variable;
  } else {
    // scope scan :3
    for (let i = scopeLevel; i >= 0; i--) {
      variable = memory[i].get(variableName);
      if (variable !== undefined) {
        return variable;
      }
    }
    let number = 0;
    try {
      number = Number(variableName);
    } catch (error) {
      throw new Error(
        "variable " + variableName + " is not a number at line " + line,
      );
      return 0;
    }
    return number;
  }
}

function jumpPointCheck(
  jumpPointName: string,
  line: number,
): [boolean, number] {
  if (jumpPoints.has(jumpPointName)) {
    const jumpPoint = jumpPoints.get(jumpPointName);
    if (jumpPoint != undefined) {
      return [true, jumpPoint];
    } else {
      throw new Error(
        "jump point " + jumpPointName + " is not defined at line " + line,
      );
      return [false, 0];
    }
  } else {
    throw new Error(
      "jump point " + jumpPointName + " is not defined at line " + line,
    );
    return [false, 0];
  }
}

export function compile(code: string): Instruction[] {
  let lines = code.split("\n");
  const instructions: Instruction[] = [];

  for (let counter = 0; counter < lines.length; counter++) {
    let line = lines[counter].trimLeft();
    if (line.trim() === "" || line.startsWith("//")) {
      continue;
    }
    let tokens = line.split(" ");
    let operation = OpCode[tokens[0].toUpperCase() as keyof typeof OpCode];
    instructions.push({
      operation,
      args: tokens.slice(1),
      line: counter + 1,
    });
  }

  return instructions;
}

export async function run(instructions: Instruction[]): Promise<number> {
  let scopeLevel = 0;
  // collect jumpPoints
  for (let counter = 0; counter < instructions.length; counter++) {
    const instruction = instructions[counter];
    if (instruction.operation === OpCode.POINT) {
      jumpPoints.set(instruction.args[0], counter);
    }
  }

  // Parse and run the code
  codeloop: for (let counter = 0; counter < instructions.length; counter++) {
    const instruction = instructions[counter];
    switch (instruction.operation) {
      case OpCode.SET: {
        let variable = variableCheck(
          instruction.args[0],
          instruction.line,
          scopeLevel,
        );
        if (variable !== undefined && !Number.isNaN(variable)) {
          if (!memory[scopeLevel]) {
            memory[scopeLevel] = new Map();
          }
          memory[scopeLevel].set(instruction.args[2], variable);
        } else {
          throw new Error("Invalid variable name at line " + instruction.line);
        }
        break;
      }
      case OpCode.PRINT: {
        const printArg = instruction.args[0];
        const printVar = variableCheck(
          instruction.args[0],
          instruction.line,
          scopeLevel,
        );
        if (Number.isNaN(printVar)) {
          throw new Error(
            "Invalid print operation at line " + instruction.line,
          );
        } else {
          buffer.push(printVar.toString());
        }
        break;
      }
      case OpCode.MATH: {
        const instructionArgs = instruction.args;
        switch (instructionArgs[1]) {
          case "+": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
              scopeLevel,
            );
            const mathOp = argument1 + argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[4], argument1 + argument2);
            }
            break;
          }
          case "-": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
              scopeLevel,
            );
            const mathOp = argument1 - argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[4], mathOp);
            }
            break;
          }
          case "*": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
              scopeLevel,
            );
            const mathOp = argument1 * argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[4], mathOp);
            }
            break;
          }
          case "/": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
              scopeLevel,
            );
            const mathOp = argument1 / argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[4], mathOp);
            }
            break;
          }
          case "%": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
              scopeLevel,
            );
            const mathOp = argument1 % argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[4], mathOp);
            }
            break;
          }
          case "**": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
              scopeLevel,
            );
            const mathOp = Math.pow(argument1, argument2);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[4], mathOp);
            }
            break;
          }
          case "sqrt": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const mathOp = Math.sqrt(argument1);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[3], mathOp);
            }
            break;
          }
          case "log": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const mathOp = Math.log(argument1);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[3], mathOp);
            }
            break;
          }
          case "rand": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const mathOp = Math.random() * argument1;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[3], mathOp);
            }
            break;
          }
          case "floor": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const mathOp = Math.floor(argument1);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[3], mathOp);
            }
            break;
          }
          case "ceil": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const mathOp = Math.ceil(argument1);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[3], mathOp);
            }
            break;
          }
          case "sin": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const mathOp = Math.sin(argument1);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[3], mathOp);
            }
            break;
          }
          default: {
            throw new Error(
              "invalid math operator at line " + instruction.line,
            );
            break codeloop;
          }
        }
        break;
      }
      case OpCode.IF: {
        const instructionArgs = instruction.args;
        switch (instructionArgs[1]) {
          case ">": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
              scopeLevel,
            );
            const check = argument1 > argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error(
                "invalid > comparison at line " + instruction.line,
              );
            } else {
              if (check) {
                const jumpPoint = jumpPointCheck(instructionArgs[4], counter);
                if (jumpPoint[0] === true) {
                  counter = jumpPoint[1];
                }
              }
            }
            break;
          }
          case "<": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
              scopeLevel,
            );
            const check = argument1 < argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error(
                "invalid < comparison at line " + instruction.line,
              );
            } else {
              if (check) {
                const jumpPoint = jumpPointCheck(instructionArgs[4], counter);
                if (jumpPoint[0] === true) {
                  counter = jumpPoint[1];
                }
              }
            }
            break;
          }
          case "==": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
              scopeLevel,
            );
            const check = argument1 == argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error(
                "invalid == comparison at line " + instruction.line,
              );
            } else {
              if (check) {
                const jumpPoint = jumpPointCheck(instructionArgs[4], counter);
                if (jumpPoint[0] === true) {
                  counter = jumpPoint[1];
                }
              }
            }
            break;
          }
          case "!=": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
              scopeLevel,
            );
            const check = argument1 != argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error(
                "invalid != comparison at line " + instruction.line,
              );
            } else {
              if (check) {
                const jumpPoint = jumpPointCheck(instructionArgs[4], counter);
                if (jumpPoint[0] === true) {
                  counter = jumpPoint[1];
                }
              }
            }
            break;
          }
          case ">=": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
              scopeLevel,
            );
            const check = argument1 >= argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error(
                "invalid >=comparison at line " + instruction.line,
              );
            } else {
              if (check) {
                const jumpPoint = jumpPointCheck(instructionArgs[4], counter);
                if (jumpPoint[0] === true) {
                  counter = jumpPoint[1];
                }
              }
            }
            break;
          }
          case "<=": {
            const argument1 = variableCheck(
              instructionArgs[0],
              instruction.line,
              scopeLevel,
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
              scopeLevel,
            );
            const check = argument1 <= argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error(
                "invalid <=comparison at line " + instruction.line,
              );
            } else {
              if (check) {
                const jumpPoint = jumpPointCheck(instructionArgs[4], counter);
                if (jumpPoint[0] === true) {
                  counter = jumpPoint[1];
                }
              }
            }
            break;
          }
          default: {
            throw new Error(
              "invalid comparison operator at line " + instruction.line,
            );
            break codeloop;
          }
        }
        break;
      }
      case OpCode.POINT: {
        break;
      }
      case OpCode.END: {
        break codeloop;
      }
      case OpCode.JUMP: {
        const jumpPoint = jumpPointCheck(instruction.args[0], counter);
        if (jumpPoint[0] === true) {
          counter = jumpPoint[1];
        }
        break;
      }
      case OpCode.MEMWIPE: {
        variableMemory.clear();
        break;
      }
      case OpCode.MEMDUMP: {
        const fixedLength = 24;
        buffer.push(
          `>>> MEMORY DUMP (Line ${instruction.line} at ${new Date().toLocaleTimeString()} <<<`,
        );
        for (const [key, value] of variableMemory.entries()) {
          buffer.push(`var ${key}: ${value}`);
        }
        for (const [key, value] of jumpPoints.entries()) {
          buffer.push(` jump ${key}: ${value}`);
        }
        buffer.push(
          `Iteration: ${counter} TotalVars: ${variableMemory.size} TotalJumps: ${jumpPoints.size} `,
        );
        buffer.push(">>> End of MEMDUMP <<<");
        break;
      }
      case OpCode.RETURN: {
        const argument1 = variableCheck(
          instruction.args[0],
          instruction.line,
          scopeLevel,
        );
        if (Number.isNaN(argument1)) {
          throw new Error(
            "Invalid return operation at line " + instruction.line,
          );
        } else {
          return argument1;
        }
      }
      case OpCode.SCOPE: {
        scopeLevel++;
        break;
      }
      case OpCode.SCOPE_END: {
        scopeLevel--;
        break;
      }
      default:
        buffer.push("Invalid operation");
        break;
    }
  }
  return 0;
}

export function resetVM() {
  variableMemory.clear();
  jumpPoints.clear();
  buffer = [];
}
