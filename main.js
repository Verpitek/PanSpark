// runtime.ts
var variableMemory = new Map;
var jumpPoints = new Map;
var signalMap = new Map([
  [0, "Prime number calculator started"],
  [1, "Initialized with limit: 100000"],
  [10, "Prime number found"],
  [999, "Prime calculation completed successfully"],
  [69, "Program finished"]
]);
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
  OpCode2[OpCode2["RETURN"] = 10] = "RETURN";
})(OpCode ||= {});
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
          console.log(`>>> MEMORY DUMP (Line ${instruction.line} at ${new Date().toLocaleTimeString()} <<<`);
          for (const [key, value] of variableMemory.entries()) {
            console.log(`var ${key}: ${value}`);
          }
          for (const [key, value] of jumpPoints.entries()) {
            console.log(` jump ${key}: ${value}`);
          }
          console.log(`Iteration: ${counter} TotalVars: ${variableMemory.size} TotalJumps: ${jumpPoints.size} `);
          console.log(">>> End of MEMDUMP <<<");
          break;
        }
        case 10 /* RETURN */: {
          const argument1 = variableCheck(instruction.args[0], instruction.line);
          if (Number.isNaN(argument1)) {
            throw new Error("Invalid return operation at line " + instruction.line);
          } else {
            return argument1;
          }
        }
        default:
          console.log("Invalid operation");
          break;
      }
    }
  return 0;
}
function resetVM() {
  variableMemory.clear();
  jumpPoints.clear();
}

// main.ts
var code2 = `
SET 0 >> num1
SET 300 >> num2
SET 0 >> counter

POINT loop
MATH num2 rand >> num1
MATH num1 floor >> num1
PRINT num1
MATH counter + 1 >> counter
IF counter < 300 >> loop
MEMDUMP
`;
run(compile(code2));
resetVM();
