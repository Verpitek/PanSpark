let variableMemory: Map<string, number> = new Map();
let jumpPoints: Map<string, number> = new Map();

enum OpCode {
  SET,
  MATH,
  PRINT,
  IF,
  JUMP,
  POINT
}

function variableCheck(variableName: string, counter: number): number {
  if (variableMemory.has(variableName)) {
    const variable = variableMemory.get(variableName)
    if (variable != undefined) {
      return variable;
    } else {
      throw new Error("variable " + variableName + " is corrupt or got lost in memory!!! at line " + counter);
      return 0;
    }
  } else {
    let number = 0;
    try {
      number = Number(variableName);
    } catch (error) {
      throw new Error("variable " + variableName + " is not a number at line " + counter);
      return 0;
    }
    return number;
  }
}

function jumpPointCheck(jumpPointName: string, counter: number): [boolean, number] {
  if (jumpPoints.has(jumpPointName)) {
    const jumpPoint = jumpPoints.get(jumpPointName)
    if (jumpPoint != undefined) {
      return [true, jumpPoint];
    } else {
      throw new Error("jump point " + jumpPointName + " is not defined at line " + counter);
      return [false, 0];
    }
  } else {
    throw new Error("jump point " + jumpPointName + " is not defined at line " + counter);
    return [false, 0];
  }
}

export function run(code: string) {
  let lines = code.split("\n");

  // collect jump jumpPointsnumber
  for (let counter = 0; counter < lines.length; counter++) {
    let line = lines[counter];
    if (line === '' || line.startsWith('//')) {
      continue;
    }
    let tokens = line.split(" ");
    let operation = tokens[0].toUpperCase();
    if (operation == "POINT") {
      jumpPoints.set(tokens[1], counter);
    }
  }
  
  // Parse and run the code
  codeloop: for (let counter = 0; counter < lines.length; counter++) {
    let line = lines[counter];
    if (line === '' || line.startsWith('//')) {
      continue;
    }
    let tokens = line.split(" ");
    let operation = tokens[0].toUpperCase();
    switch (operation) {
      case "SET": {
        variableMemory.set(tokens[3], Number(tokens[1]));
        break;
      }
      case "PRINT": {
        if (line.includes(`"`)) {
          let text = line.substring(line.indexOf(" ") + 1);
          console.log(text.replaceAll(`"`, ""));
        } else {
          const printVar = variableCheck(tokens[1], counter)
          if (Number.isNaN(printVar)){
            throw new Error("Invalid print operation at line " + counter);
          } else {
            console.log(printVar);
          }
        }
        break;
      }
      case "MATH": {
        switch (tokens[2]) {
          case "+": {
            const argument1 = variableCheck(tokens[1], counter);
            const argument2 = variableCheck(tokens[3], counter);
            const mathOp = argument1 + argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + counter);
            } else {
              variableMemory.set(tokens[5], argument1 + argument2);
            }
            break;
          }
          case "-": {
            const argument1 = variableCheck(tokens[1], counter);
            const argument2 = variableCheck(tokens[3], counter);
            const mathOp = argument1 - argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + counter);
            } else {
              variableMemory.set(tokens[5], mathOp);
            }
            break;
          }
          case "*": {
            const argument1 = variableCheck(tokens[1], counter);
            const argument2 = variableCheck(tokens[3], counter);
            const mathOp = argument1 * argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + counter);
            } else {
              variableMemory.set(tokens[5], mathOp);
            }
            break;
          }
          case "/": {
            const argument1 = variableCheck(tokens[1], counter);
            const argument2 = variableCheck(tokens[3], counter);
            const mathOp = argument1 / argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + counter);
            } else {
              variableMemory.set(tokens[5], mathOp);
            }
            break;
          }
          case "%": {
            const argument1 = variableCheck(tokens[1], counter);
            const argument2 = variableCheck(tokens[3], counter);
            const mathOp = argument1 % argument2;
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + counter);
            } else {
              variableMemory.set(tokens[5], mathOp);
            }
            break;
          }
          case "**": {
            const argument1 = variableCheck(tokens[1], counter);
            const argument2 = variableCheck(tokens[3], counter);
            const mathOp = Math.pow(argument1, argument2);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + counter);
            } else {
              variableMemory.set(tokens[5], mathOp);
            }
            break;
          }
          case "sqrt": {
            const argument1 = variableCheck(tokens[1], counter);
            const mathOp = Math.sqrt(argument1);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + counter);
            } else {
              variableMemory.set(tokens[4], mathOp);
            }
            break;
          }
          case "log": {
            const argument1 = variableCheck(tokens[1], counter);
            const mathOp = Math.log(argument1);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + counter);
            } else {
              variableMemory.set(tokens[4], mathOp);
            }
            break;
          }
          case "sin": {
            const argument1 = variableCheck(tokens[1], counter);
            const mathOp = Math.sin(argument1);
            if (Number.isNaN(mathOp)) {
              throw new Error("Invalid operation at line " + counter);
            } else {
              variableMemory.set(tokens[5], mathOp);
            }
            break;
          }
          default: {
            throw new Error("invalid math operator!");
            break codeloop;
          }
        }
        break;
      }
      case "IF": {
        // IF result > 5 >> imdone
        switch (tokens[2]) {
          case ">": {
            const argument1 = variableCheck(tokens[1], counter);
            const argument2 = variableCheck(tokens[3], counter);
            const check = argument1 > argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error("invalid comparison operator at line " + counter);
            } else {
              const jumpPoint = jumpPointCheck(tokens[5], counter);
              if (jumpPoint[0] === true) {
                counter = jumpPoint[1];
              }
            }
            break;
          }
          case "<": {
            const argument1 = variableCheck(tokens[1], counter);
            const argument2 = variableCheck(tokens[3], counter);
            const check = argument1 < argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error("invalid comparison operator at line " + counter);
            } else {
              const jumpPoint = jumpPointCheck(tokens[5], counter);
              if (jumpPoint[0] === true) {
                counter = jumpPoint[1];
              }
            }
            break;
          }
          case "==": {
            const argument1 = variableCheck(tokens[1], counter);
            const argument2 = variableCheck(tokens[3], counter);
            const check = argument1 == argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error("invalid comparison operator at line " + counter);
            } else {
              const jumpPoint = jumpPointCheck(tokens[5], counter);
              if (jumpPoint[0] === true) {
                counter = jumpPoint[1];
              }
            }
            break;
          }
          case "!=": {
            const argument1 = variableCheck(tokens[1], counter);
            const argument2 = variableCheck(tokens[3], counter);
            const check = argument1 != argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error("invalid comparison operator at line " + counter);
            } else {
              const jumpPoint = jumpPointCheck(tokens[5], counter);
              if (jumpPoint[0] === true) {
                counter = jumpPoint[1];
              }
            }
            break;
          }
          case ">=": {
            const argument1 = variableCheck(tokens[1], counter);
            const argument2 = variableCheck(tokens[3], counter);
            const check = argument1 >= argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error("invalid comparison operator at line " + counter);
            } else {
              const jumpPoint = jumpPointCheck(tokens[5], counter);
              if (jumpPoint[0] === true) {
                counter = jumpPoint[1];
              }
            }
            break;
          }
          case "<=": {
            const argument1 = variableCheck(tokens[1], counter);
            const argument2 = variableCheck(tokens[3], counter);
            const check = argument1 <= argument2;
            if (Number.isNaN(argument1) || Number.isNaN(argument2)) {
              throw new Error("invalid comparison operator at line " + counter);
            } else {
              const jumpPoint = jumpPointCheck(tokens[5], counter);
              if (jumpPoint[0] === true) {
                counter = jumpPoint[1];
              }
            }
            break;
          }
          default: {
            throw new Error("invalid comparison operator at line " + counter);
            break codeloop;
          }
        }
        break;
      }
      case "POINT": {
        break;
      }
      case "END": {
        break codeloop;
      }
        case "JUMP": {
            const jumpPoint = jumpPointCheck(tokens[1], counter)
            if (jumpPoint[0] === true) {
                counter = jumpPoint[1];
            }
          break;
        }
      default:
        console.log("Invalid operation");
        break;
    }
  }
}