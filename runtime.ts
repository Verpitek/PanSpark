let variableMemory: Map<string, number> = new Map();
let jumpPoints: Map<string, number> = new Map();

function variableCheck(variableName: string): number {
  if (variableMemory.has(variableName)) {
    const variable = variableMemory.get(variableName)
    if (variable != undefined) {
      return variable;
    } else {
      return 0;
    }
  } else {
    return parseFloat(variableName);
  }
}

function jumpPointCheck(jumpPointName: string): [boolean, number] {
  if (jumpPoints.has(jumpPointName)) {
    const jumpPoint = jumpPoints.get(jumpPointName)
    if (jumpPoint != undefined) {
      return [true, jumpPoint];
    } else {
      console.error("jump point " + jumpPointName + " is not defined");
      return [false, 0];
    }
  } else {
    console.error("jump point " + jumpPointName + " is not defined");
    return [false, 0];
  }
}

export function run(code: string) {
  let lines = code.split("\n");
  // collect jump jumpPoints
  for (let counter = 0; counter < lines.length; counter++) {
    let line = lines[counter].trim();
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
    let line = lines[counter].trim();
    if (line === '' || line.startsWith('//')) {
      continue;
    }
    let tokens = line.split(" ");
    let operation = tokens[0].toUpperCase();
    switch (operation) {
      case "SET": {
        variableMemory.set(tokens[3], parseFloat(tokens[1]));
        break;
      }
      case "PRINT": {
        if (line.includes(`"`)) {
          let text = line.substring(line.indexOf(" ") + 1);
          console.log(text.replaceAll(`"`, ""));
        } else {
          console.log(variableCheck(tokens[1]));
        }
        break;
      }
      case "MATH": {
        switch (tokens[2]) {
          case "+": {
            let argument1 = variableCheck(tokens[1]);
            let argument2 = variableCheck(tokens[3]);
            variableMemory.set(tokens[5], argument1 + argument2);
            break;
          }
          case "-": {
            let argument1 = variableCheck(tokens[1]);
            let argument2 = variableCheck(tokens[3]);
            variableMemory.set(tokens[5], argument1 - argument2);
            break;
          }
          case "*": {
            let argument1 = variableCheck(tokens[1]);
            let argument2 = variableCheck(tokens[3]);
            variableMemory.set(tokens[5], argument1 * argument2);
            break;
          }
          case "/": {
            let argument1 = variableCheck(tokens[1]);
            let argument2 = variableCheck(tokens[3]);
            variableMemory.set(tokens[5], argument1 / argument2);
            break;
          }
          case "%": {
            let argument1 = variableCheck(tokens[1]);
            let argument2 = variableCheck(tokens[3]);
            variableMemory.set(tokens[5], argument1 % argument2);
            break;
          }
          case "**": {
            let argument1 = variableCheck(tokens[1]);
            let argument2 = variableCheck(tokens[3]);
            variableMemory.set(tokens[5], Math.pow(argument1, argument2));
            break;
          }
          case "sqrt": {
            let argument1 = variableCheck(tokens[1]);
            variableMemory.set(tokens[4], Math.sqrt(argument1));
            break;
          }
          case "log": {
            let argument1 = variableCheck(tokens[1]);
            variableMemory.set(tokens[4], Math.log(argument1));
            break;
          }
          case "sin": {
            let argument1 = variableCheck(tokens[1]);
            variableMemory.set(tokens[5], Math.sin(argument1));
            break;
          }
          default: {
            console.error("invalid math operator!");
            break codeloop;
          }
        }
        break;
      }
      case "IF": {
        // IF result > 5 >> imdone
        switch (tokens[2]) {
          case ">": {
            let argument1 = variableCheck(tokens[1]);
            let argument2 = variableCheck(tokens[3]);
            if (argument1 > argument2) {
              const jumpPoint = jumpPointCheck(tokens[5])
                if (jumpPoint[0] === true) {
                  counter = jumpPoint[1];
                }
            }
            break;
          }
          case "<": {
            let argument1 = variableCheck(tokens[1]);
            let argument2 = variableCheck(tokens[3]);
            if (argument1 < argument2) {
              const jumpPoint = jumpPointCheck(tokens[5])
                if (jumpPoint[0] === true) {
                  counter = jumpPoint[1];
                }
            }
            break;
          }
          case "==": {
            let argument1 = variableCheck(tokens[1]);
            let argument2 = variableCheck(tokens[3]);
            if (argument1 == argument2) {
              const jumpPoint = jumpPointCheck(tokens[5])
                if (jumpPoint[0] === true) {
                  counter = jumpPoint[1];
                }
            }
            break;
          }
          case "!=": {
            let argument1 = variableCheck(tokens[1]);
            let argument2 = variableCheck(tokens[3]);
            if (argument1 != argument2) {
              const jumpPoint = jumpPointCheck(tokens[5])
                if (jumpPoint[0] === true) {
                  counter = jumpPoint[1];
                }
            }
            break;
          }
          case ">=": {
            let argument1 = variableCheck(tokens[1]);
            let argument2 = variableCheck(tokens[3]);
            if (argument1 >= argument2) {
              const jumpPoint = jumpPointCheck(tokens[5])
                if (jumpPoint[0] === true) {
                  counter = jumpPoint[1];
                }
            }
            break;
          }
          case "<=": {
            let argument1 = variableCheck(tokens[1]);
            let argument2 = variableCheck(tokens[3]);
            if (argument1 <= argument2) {
              const jumpPoint = jumpPointCheck(tokens[5])
                if (jumpPoint[0] === true) {
                  counter = jumpPoint[1];
                }
            }
            break;
          }
          default: {
            console.error("invalid comparison operator!");
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
      default:
        console.log("Invalid operation");
        break;
    }
  }
}