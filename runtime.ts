let variableMemory: Map<string, number> = new Map();
let jumpPoints: Map<string, number> = new Map();

enum OpCode {
  SET,
  MATH,
  PRINT,
  IF,
  JUMP,
  POINT,
  END,
  SIGNAL,
  MEMVIPE,
}

interface Instruction {
  operation: OpCode;
  args: string[];
  line: number;
}

const signalMap = new Map<number, string>([
    [0, "Prime number calculator started"],
    [1, "Initialized with limit: 100000"],
    [10, "Prime number found"],
    [999, "Prime calculation completed successfully"]
]);

function variableCheck(variableName: string, line: number): number {
  if (variableMemory.has(variableName)) {
    const variable = variableMemory.get(variableName)
    if (variable != undefined) {
      return variable;
    } else {
      throw new Error("variable " + variableName + " is corrupt or got lost in memory!!! at line " + line);
      return 0;
    }
  } else {
    let number = 0;
    try {
      number = Number(variableName);
    } catch (error) {
      throw new Error("variable " + variableName + " is not a number at line " + line);
      return 0;
    }
    return number;
  }
}

function jumpPointCheck(jumpPointName: string, line: number): [boolean, number] {
  if (jumpPoints.has(jumpPointName)) {
    const jumpPoint = jumpPoints.get(jumpPointName)
    if (jumpPoint != undefined) {
      return [true, jumpPoint];
    } else {
      throw new Error("jump point " + jumpPointName + " is not defined at line " + line);
      return [false, 0];
    }
  } else {
    throw new Error("jump point " + jumpPointName + " is not defined at line " + line);
    return [false, 0];
  }
}

export function compile(code: string): Instruction[] {
  let lines = code.split("\n");
  const instructions: Instruction[] = [];
  
  for (let counter = 0; counter < lines.length; counter++) {
    let line = lines[counter];
    if (line.trim() === '' || line.startsWith('//') ) {
      continue;
    }
    let tokens = line.split(" ");
    let operation = OpCode[tokens[0].toUpperCase() as keyof typeof OpCode];
    instructions.push({
      operation,
      args: tokens.slice(1),
      line: counter + 1
    })
  }
  
  return instructions;
}

export function run(instructions: Instruction[]) {
  // collect jumpPoints
  for (let counter = 0; counter < instructions.length; counter++) {
    const instruction = instructions[counter]
    if (instruction.operation === OpCode.POINT) {
      jumpPoints.set(instruction.args[0], counter);
    }
  }
  
  // Parse and run the code
  codeloop: for (let counter = 0; counter < instructions.length; counter++) {
    const instruction = instructions[counter];
    switch (instruction.operation) {
      case OpCode.SET: {
        let variable = variableCheck(instruction.args[0], instruction.line);
        if (variable) {
          variableMemory.set(instruction.args[2], variable);
        } else {
          throw new Error("Invalid variable name at line " + instruction.line);
        }
        break;
      }
      case OpCode.PRINT: {
        const printArg = instruction.args[0]
        const printVar = variableCheck(instruction.args[0], instruction.line)
        if (Number.isNaN(printVar)) {
          throw new Error("Invalid print operation at line " + instruction.line);
        } else {
          console.log(printVar);
        }
        break;
      }
      case OpCode.MATH: {
        const instructionArgs = instruction.args
        switch (instructionArgs[1]) {
          case "+": {
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const argument2 = variableCheck(instructionArgs[2], instruction.line);
            const mathOp = argument1 + argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[4], argument1 + argument2);
            }
            break;
          }
          case "-": {
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const argument2 = variableCheck(instructionArgs[2], instruction.line);
            const mathOp = argument1 - argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[4], mathOp);
            }
            break;
          }
          case "*": {
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const argument2 = variableCheck(instructionArgs[2], instruction.line);
            const mathOp = argument1 * argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[4], mathOp);
            }
            break;
          }
          case "/": {
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const argument2 = variableCheck(instructionArgs[2], instruction.line);
            const mathOp = argument1 / argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[4], mathOp);
            }
            break;
          }
          case "%": {
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const argument2 = variableCheck(instructionArgs[2], instruction.line);
            const mathOp = argument1 % argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[4], mathOp);
            }
            break;
          }
          case "**": {
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const argument2 = variableCheck(instructionArgs[2], instruction.line);
            const mathOp = Math.pow(argument1, argument2);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[4], mathOp);
            }
            break;
          }
          case "sqrt": {
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const mathOp = Math.sqrt(argument1);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[3], mathOp);
            }
            break;
          }
          case "log": {
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const mathOp = Math.log(argument1);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[3], mathOp);
            }
            break;
          }
          case "sin": {
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const mathOp = Math.sin(argument1);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + instruction.line);
            } else {
              variableMemory.set(instructionArgs[3], mathOp);
            }
            break;
          }
          default: {
            throw new Error("invalid math operator at line " + instruction.line);
            break codeloop;
          }
        }
        break;
      }
      case OpCode.IF: {
        const instructionArgs = instruction.args;
        switch (instructionArgs[1]) {
          case ">": {
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const argument2 = variableCheck(instructionArgs[2], instruction.line);
            const check = argument1 > argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error("invalid > comparison at line " + instruction.line);
            } else {
              if (check) {
                const jumpPoint = jumpPointCheck(instructionArgs[4], counter);
                if (jumpPoint[0] === true) {
                counter = jumpPoint[1];
              }}
            }
            break;
          }
          case "<": {
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const argument2 = variableCheck(instructionArgs[2], instruction.line);
            const check = argument1 < argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error("invalid < comparison at line " + instruction.line);
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
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const argument2 = variableCheck(instructionArgs[2], instruction.line);
            const check = argument1 == argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error("invalid == comparison at line " + instruction.line);
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
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const argument2 = variableCheck(instructionArgs[2], instruction.line);
            const check = argument1 != argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error("invalid != comparison at line " + instruction.line);
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
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const argument2 = variableCheck(instructionArgs[2], instruction.line);
            const check = argument1 >= argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error("invalid >=comparison at line " + instruction.line);
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
            const argument1 = variableCheck(instructionArgs[0], instruction.line);
            const argument2 = variableCheck(instructionArgs[2], instruction.line);
            const check = argument1 <= argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error("invalid <=comparison at line " + instruction.line);
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
            throw new Error("invalid comparison operator at line " + instruction.line);
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
      case OpCode.MEMVIPE: {
        variableMemory.clear();
      }
      case OpCode.SIGNAL: {
          const signalCode = variableCheck(instruction.args[0], instruction.line);
          
          // Look up the signal message from an external map
          if (signalMap && signalMap.has(signalCode)) {
              console.log(signalMap.get(signalCode));
          } else {
              // Fallback: just print the numeric code
              console.log(`[Signal ${signalCode}]`);
          }
          break;
      }
      default:
        console.log("Invalid operation");
        break;
    }
  }
}