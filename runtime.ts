
export let procPoints: Map<string, number> = new Map();

export let memory: Map<string, number>[] = [new Map<string, number>()];

export let buffer: string[] = [];

enum OpCode {
  SET,
  MATH,
  PRINT,
  IF,
  JUMP,
  END,
  RETURN,
  PROC,
  ENDPROC,
}

interface Instruction {
  operation: OpCode;
  args: string[];
  line: number;
}

function setVariableMemory(variableName: string, value: number, scopeLevel: number) {
  for (let i = scopeLevel; i >= 0; i--) {
    const scope = memory[i];
    if (scope && scope.has(variableName)) {
      scope.set(variableName, value);
      return;
    }
  }
  if (memory[scopeLevel] === undefined) {
    memory[scopeLevel] = new Map<string, number>();
  }
  memory[scopeLevel].set(variableName, value);
}

function variableCheck(
  variableName: string,
  line: number,
  scopeLevel: number,
): number {
  // Check if variable exists in any scope
  for (let i = scopeLevel; i >= 0; i--) {
    const scope = memory[i];
    if (scope && scope.has(variableName)) {
      return scope.get(variableName)!;
    }
  }

  const numericValue = Number(variableName);
  if (!isNaN(numericValue)) {
    return numericValue;
  }

  throw new Error(`Variable "${variableName}" is not defined at line ${line}`);
}

function procPointCheck(
  procPointName: string,
  line: number,
): [boolean, number] {
  if (procPoints.has(procPointName)) {
    const procPoint = procPoints.get(procPointName);
    if (procPoint != undefined) {
      return [true, procPoint];
    } else {
      throw new Error(
        "proc point " + procPointName + " is not defined at line " + line,
      );
      return [false, 0];
    }
  } else {
    throw new Error(
      "proc point " + procPointName + " is not defined at line " + line,
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
  // collect procPoints
  for (let counter = 0; counter < instructions.length; counter++) {
    const instruction = instructions[counter];
    if (instruction.operation === OpCode.PROC) {
      procPoints.set(instruction.args[0], counter);
    }
  }
  
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
              setVariableMemory(instructionArgs[4], argument1 + argument2, scopeLevel);
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
              setVariableMemory(instructionArgs[4], mathOp, scopeLevel);
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
              setVariableMemory(instructionArgs[4], mathOp, scopeLevel);
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
              setVariableMemory(instructionArgs[4], mathOp, scopeLevel);
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
              setVariableMemory(instructionArgs[4], mathOp, scopeLevel);
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
              setVariableMemory(instructionArgs[4], mathOp, scopeLevel);
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
              setVariableMemory(instructionArgs[3], mathOp, scopeLevel);
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
              setVariableMemory(instructionArgs[3], mathOp, scopeLevel);
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
              setVariableMemory(instructionArgs[3], mathOp, scopeLevel);
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
              setVariableMemory(instructionArgs[3], mathOp, scopeLevel);
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
              setVariableMemory(instructionArgs[3], mathOp, scopeLevel);
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
              setVariableMemory(instructionArgs[3], mathOp, scopeLevel);
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
                const procPoint = procPointCheck(instructionArgs[4], counter);
                if (procPoint[0] === true) {
                  counter = procPoint[1] - 1;
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
                const procPoint = procPointCheck(instructionArgs[4], counter);
                if (procPoint[0] === true) {
                  counter = procPoint[1] - 1;
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
                const procPoint = procPointCheck(instructionArgs[4], counter);
                if (procPoint[0] === true) {
                  counter = procPoint[1] - 1;
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
                const procPoint = procPointCheck(instructionArgs[4], counter);
                if (procPoint[0] === true) {
                  counter = procPoint[1] - 1;
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
                const procPoint = procPointCheck(instructionArgs[4], counter);
                if (procPoint[0] === true) {
                  counter = procPoint[1] - 1;
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
                const procPoint = procPointCheck(instructionArgs[4], counter);
                if (procPoint[0] === true) {
                  counter = procPoint[1] - 1;
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
      case OpCode.END: {
        break codeloop;
      }
      case OpCode.JUMP: {
        const procPoint = procPointCheck(instruction.args[0], counter);
        if (procPoint[0] === true) {
          counter = procPoint[1] - 1;
        }
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
      case OpCode.PROC: {
        scopeLevel++;
        break;
      }
      case OpCode.ENDPROC: {
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
  memory = [new Map<string, number>()];
  procPoints.clear();
  buffer = [];
}
