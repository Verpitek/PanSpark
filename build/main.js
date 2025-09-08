// runtime.ts
var variableMemory = new Map;
var jumpPoints = new Map;
var colors = {
  Reset: "\x1B[0m",
  Bright: "\x1B[1m",
  Dim: "\x1B[2m",
  Underscore: "\x1B[4m",
  Blink: "\x1B[5m",
  Reverse: "\x1B[7m",
  Hidden: "\x1B[8m",
  fg: {
    Black: "\x1B[30m",
    Red: "\x1B[31m",
    Green: "\x1B[32m",
    Yellow: "\x1B[33m",
    Blue: "\x1B[34m",
    Magenta: "\x1B[35m",
    Cyan: "\x1B[36m",
    White: "\x1B[37m",
    BrightBlack: "\x1B[90m",
    BrightRed: "\x1B[91m",
    BrightGreen: "\x1B[92m",
    BrightYellow: "\x1B[93m",
    BrightBlue: "\x1B[94m",
    BrightMagenta: "\x1B[95m",
    BrightCyan: "\x1B[96m",
    BrightWhite: "\x1B[97m",
    Crimson: "\x1B[38;5;160m",
    DarkRed: "\x1B[38;5;88m",
    DarkCyan: "\x1B[38;5;36m",
    Orange: "\x1B[38;5;208m",
    Pink: "\x1B[38;5;200m",
    Purple: "\x1B[38;5;129m",
    Teal: "\x1B[38;5;30m",
    Olive: "\x1B[38;5;58m"
  },
  bg: {
    Black: "\x1B[40m",
    Red: "\x1B[41m",
    Green: "\x1B[42m",
    Yellow: "\x1B[43m",
    Blue: "\x1B[44m",
    Magenta: "\x1B[45m",
    Cyan: "\x1B[46m",
    White: "\x1B[47m",
    BrightBlack: "\x1B[100m",
    BrightRed: "\x1B[101m",
    BrightGreen: "\x1B[102m",
    BrightYellow: "\x1B[103m",
    BrightBlue: "\x1B[104m",
    BrightMagenta: "\x1B[105m",
    BrightCyan: "\x1B[106m",
    BrightWhite: "\x1B[107m",
    Crimson: "\x1B[48;5;160m",
    DarkRed: "\x1B[48;5;88m",
    DarkCyan: "\x1B[48;5;36m",
    Orange: "\x1B[48;5;208m",
    Pink: "\x1B[48;5;200m",
    Purple: "\x1B[48;5;129m",
    Teal: "\x1B[48;5;30m",
    Olive: "\x1B[48;5;58m"
  }
};
var OpCode;
((OpCode2) => {
  OpCode2[OpCode2["SET"] = 0] = "SET";
  OpCode2[OpCode2["MATH"] = 1] = "MATH";
  OpCode2[OpCode2["PRINT"] = 2] = "PRINT";
  OpCode2[OpCode2["IF"] = 3] = "IF";
  OpCode2[OpCode2["JUMP"] = 4] = "JUMP";
  OpCode2[OpCode2["POINT"] = 5] = "POINT";
  OpCode2[OpCode2["END"] = 6] = "END";
  OpCode2[OpCode2["SIGNAL"] = 7] = "SIGNAL";
  OpCode2[OpCode2["MEMVIPE"] = 8] = "MEMVIPE";
  OpCode2[OpCode2["MEMDUMP"] = 9] = "MEMDUMP";
  OpCode2[OpCode2["INPUT"] = 10] = "INPUT";
  OpCode2[OpCode2["CALL"] = 11] = "CALL";
  OpCode2[OpCode2["RETURN"] = 12] = "RETURN";
})(OpCode ||= {});
var signalMap = new Map([
  [0, "Prime number calculator started"],
  [1, "Initialized with limit: 100000"],
  [10, "Prime number found"],
  [999, "Prime calculation completed successfully"]
]);
function variableCheck(variableName, line) {
  const variable = variableMemory.get(variableName);
  if (variable !== undefined) {
    return variable;
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
function jumpPointCheck(jumpPointName, line) {
  if (jumpPoints.has(jumpPointName)) {
    const jumpPoint = jumpPoints.get(jumpPointName);
    if (jumpPoint != null) {
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
function compile(code) {
  let lines = code.split(`
`);
  const instructions = [];
  for (let counter = 0;counter < lines.length; counter++) {
    let line = lines[counter];
    if (line.trim() === "" || line.startsWith("//")) {
      continue;
    }
    let tokens = line.split(" ");
    let operation = OpCode[tokens[0].toUpperCase()];
    instructions.push({
      operation,
      args: tokens.slice(1),
      line: counter + 1
    });
  }
  return instructions;
}
async function run(instructions) {
  for (let counter = 0;counter < instructions.length; counter++) {
    const instruction = instructions[counter];
    if (instruction.operation === 5 /* POINT */) {
      jumpPoints.set(instruction.args[0], counter);
    }
  }
  codeloop:
    for (let counter = 0;counter < instructions.length; counter++) {
      const instruction = instructions[counter];
      switch (instruction.operation) {
        case 0 /* SET */: {
          let variable = variableCheck(instruction.args[0], instruction.line);
          if (variable !== undefined && !Number.isNaN(variable)) {
            variableMemory.set(instruction.args[2], variable);
          } else {
            throw new Error("Invalid variable name at line " + instruction.line);
          }
          break;
        }
        case 2 /* PRINT */: {
          const printArg = instruction.args[0];
          const printVar = variableCheck(instruction.args[0], instruction.line);
          if (Number.isNaN(printVar)) {
            throw new Error("Invalid print operation at line " + instruction.line);
          } else {
            console.log(printVar);
          }
          break;
        }
        case 1 /* MATH */: {
          const instructionArgs = instruction.args;
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
            case "rand": {
              const argument1 = variableCheck(instructionArgs[0], instruction.line);
              const mathOp = Math.random() * argument1;
              if (Number.isNaN(mathOp)) {
                throw new Error("Invalid operation at line " + instruction.line);
              } else {
                variableMemory.set(instructionArgs[3], mathOp);
              }
              break;
            }
            case "floor": {
              const argument1 = variableCheck(instructionArgs[0], instruction.line);
              const mathOp = Math.floor(argument1);
              if (Number.isNaN(mathOp)) {
                throw new Error("Invalid operation at line " + instruction.line);
              } else {
                variableMemory.set(instructionArgs[3], mathOp);
              }
              break;
            }
            case "ceil": {
              const argument1 = variableCheck(instructionArgs[0], instruction.line);
              const mathOp = Math.ceil(argument1);
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
        case 3 /* IF */: {
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
                  }
                }
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
        case 5 /* POINT */: {
          break;
        }
        case 6 /* END */: {
          break codeloop;
        }
        case 4 /* JUMP */: {
          const jumpPoint = jumpPointCheck(instruction.args[0], counter);
          if (jumpPoint[0] === true) {
            counter = jumpPoint[1];
          }
          break;
        }
        case 8 /* MEMVIPE */: {
          variableMemory.clear();
        }
        case 7 /* SIGNAL */: {
          const signalCode = variableCheck(instruction.args[0], instruction.line);
          if (signalMap && signalMap.has(signalCode)) {
            console.log(signalMap.get(signalCode));
          } else {
            console.log(`[Signal ${signalCode}]`);
          }
          break;
        }
        case 9 /* MEMDUMP */: {
          const fixedLength = 24;
          console.log(colors.bg.Red, colors.fg.White, `>>> MEMORY DUMP (•˕ •マ.ᐟ Line ${instruction.line} at ${new Date().toLocaleTimeString()} <<<`, colors.Reset, colors.Reset);
          for (const [key, value] of variableMemory.entries()) {
            console.log(colors.bg.Crimson, colors.fg.White, `var ${key}: ${value}`, colors.Reset, colors.Reset);
          }
          for (const [key, value] of jumpPoints.entries()) {
            console.log(colors.bg.DarkCyan, ` jump ${key}: ${value}`, colors.Reset);
          }
          console.log(colors.bg.Magenta, colors.fg.White, `Iteration: ${counter} TotalVars: ${variableMemory.size} TotalJumps: ${jumpPoints.size} `, colors.Reset);
          break;
        }
        case 10 /* INPUT */: {
          break;
        }
        default:
          console.log("Invalid operation");
          break;
      }
    }
}
function resetVM() {
  variableMemory.clear();
  jumpPoints.clear();
}

// main.ts
var code = `
SIGNAL 0  // Program started
SET 100000 >> limit
SET 2 >> current
SIGNAL 1  // Prime calculation initialized

POINT outer_loop
SET 1 >> is_prime
SET 2 >> divisor

POINT inner_loop
MATH current % divisor >> remainder

IF remainder == 0 >> not_prime
MATH divisor + 1 >> divisor
IF divisor < current >> inner_loop

IF is_prime == 1 >> print_prime
POINT not_prime
JUMP next_number // this is a jump point, im testing comments

POINT print_prime
PRINT current  // Print the prime number itself

POINT next_number
MATH current + 1 >> current
IF current <= limit >> outer_loop

SIGNAL 999  // Prime calculation complete
MEMDUMP
`;
console.time("runtime");
run(compile(code));
console.timeEnd("runtime");
resetVM();
