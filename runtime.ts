let variableMemory: Map<string, number> = new Map();
let jumpPoints: Map<string, number> = new Map();

const colors = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",
  fg: {
    Black: "\x1b[30m",
    Red: "\x1b[31m",
    Green: "\x1b[32m",
    Yellow: "\x1b[33m",
    Blue: "\x1b[34m",
    Magenta: "\x1b[35m",
    Cyan: "\x1b[36m",
    White: "\x1b[37m",
    BrightBlack: "\x1b[90m",
    BrightRed: "\x1b[91m",
    BrightGreen: "\x1b[92m",
    BrightYellow: "\x1b[93m",
    BrightBlue: "\x1b[94m",
    BrightMagenta: "\x1b[95m",
    BrightCyan: "\x1b[96m",
    BrightWhite: "\x1b[97m",
    Crimson: "\x1b[38;5;160m",
    DarkRed: "\x1b[38;5;88m",
    DarkCyan: "\x1b[38;5;36m",
    Orange: "\x1b[38;5;208m",
    Pink: "\x1b[38;5;200m",
    Purple: "\x1b[38;5;129m",
    Teal: "\x1b[38;5;30m",
    Olive: "\x1b[38;5;58m",
  },

  // --- Background Colors ---
  bg: {
    // Standard ANSI Colors
    Black: "\x1b[40m",
    Red: "\x1b[41m",
    Green: "\x1b[42m",
    Yellow: "\x1b[43m",
    Blue: "\x1b[44m",
    Magenta: "\x1b[45m",
    Cyan: "\x1b[46m",
    White: "\x1b[47m",

    // Bright ANSI Colors
    BrightBlack: "\x1b[100m",
    BrightRed: "\x1b[101m",
    BrightGreen: "\x1b[102m",
    BrightYellow: "\x1b[103m",
    BrightBlue: "\x1b[104m",
    BrightMagenta: "\x1b[105m",
    BrightCyan: "\x1b[106m",
    BrightWhite: "\x1b[107m",

    // Extended 256-Color Palette
    Crimson: "\x1b[48;5;160m",
    DarkRed: "\x1b[48;5;88m",
    DarkCyan: "\x1b[48;5;36m",
    Orange: "\x1b[48;5;208m",
    Pink: "\x1b[48;5;200m",
    Purple: "\x1b[48;5;129m",
    Teal: "\x1b[48;5;30m",
    Olive: "\x1b[48;5;58m",
  },
};

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
  MEMDUMP,
  INPUT,
  CALL, // NOT DONE
  RETURN, // NOT DONE
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
  [999, "Prime calculation completed successfully"],
]);

function variableCheck(variableName: string, line: number): number {
  const variable = variableMemory.get(variableName);
  if (variable !== undefined) {
    return variable;
  } else {
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
    let line = lines[counter];
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

export async function run(instructions: Instruction[]) {
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
        let variable = variableCheck(instruction.args[0], instruction.line);
        if (variable !== undefined && !Number.isNaN(variable)) {
          variableMemory.set(instruction.args[2], variable);
        } else {
          throw new Error("Invalid variable name at line " + instruction.line);
        }
        break;
      }
      case OpCode.PRINT: {
        const printArg = instruction.args[0];
        const printVar = variableCheck(instruction.args[0], instruction.line);
        if (Number.isNaN(printVar)) {
          throw new Error(
            "Invalid print operation at line " + instruction.line,
          );
        } else {
          console.log(printVar);
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
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
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
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
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
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
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
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
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
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
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
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
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
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
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
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
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
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
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
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
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
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
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
            );
            const argument2 = variableCheck(
              instructionArgs[2],
              instruction.line,
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
      case OpCode.MEMVIPE: {
        variableMemory.clear();
      }
      case OpCode.SIGNAL: {
        const signalCode = variableCheck(instruction.args[0], instruction.line);
        if (signalMap && signalMap.has(signalCode)) {
          console.log(signalMap.get(signalCode));
        } else {
          console.log(`[Signal ${signalCode}]`);
        }
        break;
      }
      case OpCode.MEMDUMP: {
        const fixedLength = 24;
        console.log(
          colors.bg.Red,
          colors.fg.White,
          `>>> MEMORY DUMP (\u2022\u02D5 \u2022\u30DE.\u141F Line ${instruction.line} at ${new Date().toLocaleTimeString()} <<<`,
          colors.Reset,
          colors.Reset,
        );
        for (const [key, value] of variableMemory.entries()) {
          console.log(
            colors.bg.Crimson,
            colors.fg.White,
            `var ${key}: ${value}`,
            colors.Reset,
            colors.Reset,
          );
        }
        for (const [key, value] of jumpPoints.entries()) {
          console.log(
            colors.bg.DarkCyan,
            ` jump ${key}: ${value}`,
            colors.Reset,
          );
        }
        console.log(
          colors.bg.Magenta,
          colors.fg.White,
          `Iteration: ${counter} TotalVars: ${variableMemory.size} TotalJumps: ${jumpPoints.size} `,
          colors.Reset,
        );
        break;
      }
      case OpCode.INPUT: {
        break;
      }
      default:
        console.log("Invalid operation");
        break;
    }
  }
}

export function resetVM() {
  variableMemory.clear();
  jumpPoints.clear();
}
