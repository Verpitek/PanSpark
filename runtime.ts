// Jump point memory
export let jumpPoints: Map<string, number> = new Map();
// Procedure point memory
export let procPoints: Map<string, [number, number]> = new Map();
// Memory for variables
export let variableMemory: Map<string, number> = new Map<string, number>();
// Output buffer for output
export let buffer: string[] = [];
// Inside Procedure Lock
export let procLock = false;
// PROC local memory
export let procVariableMemory: Map<string, number> = new Map<string, number>();
// PROC arguments
export let procArgs: number[] = [];
// PROC last location
export let procLastLocation: number = 0;
// PROC return
export let procReturn: number = 0;
// PROC return name
export let procReturnValueTarget: string | null = null;


enum OpCode {
  SET,
  MATH,
  PRINT,
  ECHO,
  IF,
  JUMP,
  END,
  RETURN,
  POINT,
  CALL,
  PROC,
  "}"
}

interface Instruction {
  operation: OpCode;
  args: string[];
  line: number;
}

function setVariableMemory(variableName: string, value: number) {
  if (procLock) {
      procVariableMemory.set(variableName, value);
      return;
    }
    variableMemory.set(variableName, value);
}

function variableCheck(
  variableName: string,
  line: number
): number {
    if (procLock) {
      const procValue = procVariableMemory.get(variableName);
      if (procValue !== undefined) {
        return procValue;
      }
    }

    const globalValue = variableMemory.get(variableName);
    if (globalValue !== undefined) {
      return globalValue;
    }

    const numericValue = Number(variableName);
    if (!isNaN(numericValue)) {
      return numericValue;
    }

    throw new Error(`Variable "${variableName}" is not defined at line ${line}`);
}

function jumpPointCheck(jumpPointName: string, line: number): number {
    const jumpPoint = jumpPoints.get(jumpPointName);
    if (jumpPoint === undefined) {
        throw new Error(`Jump point "${jumpPointName}" is not defined at line ${line}.`);
    }
    return jumpPoint;
}

function procPointCheck(procName: string, line: number): [number, number] {
    const procPoint = procPoints.get(procName);
    if (procPoint === undefined) {
        throw new Error(`Proc "${procName}" is not defined at line ${line}.`);
    }
    return procPoint;
}

export function compile(code: string): Instruction[] {
  let lines = code.split("\n");
  const instructions: Instruction[] = [];

  for (let counter = 0; counter < lines.length; counter++) {
    let line = lines[counter].trim();
    if (line === "" || line.startsWith("//")) {
      continue;
    }
    const regex = /"([^"]*)"|\s*>>\s*(\S+)|\(([^)]*)\)|(\S+)/g;
    let tokens = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
        if (match[1] !== undefined) {
            // Handle double-quoted string
            tokens.push(match[1]);
        } else if (match[2] !== undefined) {
            // Handle >> symbol with its argument
            tokens.push(">>", match[2]);
        } else {
            // Handle parentheses content or regular token
            tokens.push(match[3] || match[4]);
        }
    }
  
    let operation = OpCode[tokens[0].toUpperCase() as keyof typeof OpCode];
    instructions.push({
      operation,
      args: tokens.slice(1),
      line: counter + 1,
    });
  }
  
  for (let counter = 0; counter < instructions.length; counter++) {
    const instruction = instructions[counter];
    if (instruction.operation === OpCode.POINT) {
      jumpPoints.set(instruction.args[0], counter);
    }
  }
  
  let procPoint = {
    name: "",
    startLine: 0,
    endLine: 0
  };
  let procOpen = false;
  for (let counter = 0; counter < instructions.length; counter++) {
    const instruction = instructions[counter];
    if (!procOpen) {
      if (instruction.operation === OpCode.PROC) {
        procPoint = {
          name: instruction.args[0],
          startLine: counter,
          endLine: 0
        };
        procOpen = true;
      }
    }
    if (instruction.operation === OpCode["}"]) {
      procPoint.endLine = counter;
      procPoints.set(procPoint.name, [procPoint.startLine, procPoint.endLine]);
      procOpen = false;
    }
  }

  return instructions;
}

export function* run(instructions: Instruction[]) {
  let counter = 0;
  codeloop: while (counter < instructions.length) {
    yield counter;
    const instruction = instructions[counter];
    switch (instruction.operation) {
      case OpCode.SET: {
        const value = variableCheck(
          instruction.args[0],
          instruction.line,
        );
        setVariableMemory(instruction.args[2], value);
        break;
      }
      case OpCode.PRINT: {
        const printArg = instruction.args[0];
        const printVar = variableCheck(
          instruction.args[0],
          instruction.line,
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
      case OpCode.ECHO: {
        const echoArg = instruction.args[0];
        buffer.push(echoArg.toString());
        break;
      }
      case OpCode.MATH: {
          const instructionArgs = instruction.args;
          const line = instruction.line;
      
          const binaryOperators = new Map<string, (a: number, b: number) => number>([
              ["+", (a, b) => a + b],
              ["-", (a, b) => a - b],
              ["*", (a, b) => a * b],
              ["/", (a, b) => a / b],
              ["%", (a, b) => a % b],
              ["**", (a, b) => Math.pow(a, b)],
              ["min", (a, b) => Math.min(a, b)],
              ["max", (a, b) => Math.max(a, b)],
          ]);
      
          const unaryOperators = new Map<string, (a: number) => number>([
              ["sqrt", (a) => Math.sqrt(a)],
              ["log", (a) => Math.log(a)],          // Natural log
              ["floor", (a) => Math.floor(a)],
              ["ceil", (a) => Math.ceil(a)],
              ["sin", (a) => Math.sin(a)],
              ["rand", (max) => Math.random() * max],
              ["cos", (a) => Math.cos(a)],
              ["tan", (a) => Math.tan(a)],
              ["abs", (a) => Math.abs(a)],          // Absolute value
              ["round", (a) => Math.round(a)],      // Rounds to the nearest integer
              ["log10", (a) => Math.log10(a)],    // Base-10 log
              ["exp", (a) => Math.exp(a)],          // e^x
          ]);
      
          const op = instructionArgs[1]; // The operator is always the second argument.
          let result: number;
          let destVariable: string;
      
          if (binaryOperators.has(op)) {
              if (instructionArgs.length !== 5 || instructionArgs[3] !== ">>") {
                  throw new Error(`Invalid syntax for binary math operation at line ${line}. Expected: MATH var1 op var2 >> result`);
              }
              const arg1 = variableCheck(instructionArgs[0], line);
              const arg2 = variableCheck(instructionArgs[2], line);
              destVariable = instructionArgs[4];
              
              const operation = binaryOperators.get(op)!; // The '!' asserts that the value exists.
              result = operation(arg1, arg2);
      
          } else if (unaryOperators.has(op)) {
              if (instructionArgs.length !== 4 || instructionArgs[2] !== ">>") {
                  throw new Error(`Invalid syntax for unary math operation at line ${line}. Expected: MATH var1 op >> result`);
              }
              const arg1 = variableCheck(instructionArgs[0], line);
              destVariable = instructionArgs[3];
      
              const operation = unaryOperators.get(op)!;
              result = operation(arg1);
      
          } else {
              throw new Error(`Unknown math operator "${op}" at line ${line}`);
          }
      
          // Centralized check and assignment
          if (Number.isNaN(result)) {
              throw new Error(`Math operation resulted in NaN at line ${line}. Check for invalid inputs like sqrt(-1) or 0/0.`);
          } else {
              setVariableMemory(destVariable, result);
          }
      
          break;
      }
      case OpCode.IF: {
        const instructionArgs = instruction.args;
                const argument1 = variableCheck(instructionArgs[0], instruction.line);
                const argument2 = variableCheck(instructionArgs[2], instruction.line);
                let check = false;
                switch (instructionArgs[1]) {
                    case ">":  check = argument1 > argument2; break;
                    case "<":  check = argument1 < argument2; break;
                    case "==": check = argument1 == argument2; break;
                    case "!=": check = argument1 != argument2; break;
                    case ">=": check = argument1 >= argument2; break;
                    case "<=": check = argument1 <= argument2; break;
                    default:
                        throw new Error(`Invalid comparison operator at line ${instruction.line}`);
                }
                if (check) {
                    counter = jumpPointCheck(instructionArgs[4], instruction.line) -1;
                }
                break;
      }
      case OpCode.END: {
        break codeloop;
      }
      case OpCode.JUMP: {
        const procPoint = jumpPointCheck(instruction.args[0], counter);
        counter = procPoint - 1;
        break;
      }
      case OpCode.RETURN: {
        if (procLock) {
            if (instruction.args.length > 0) {
                procReturn = variableCheck(instruction.args[0], instruction.line);
            }
        }
        break; 
      }
      case OpCode.POINT: {
        break;
      }
      case OpCode.PROC: {
        const instructionArgs = instruction.args;
        if (!procLock) {
          const procPoint = procPointCheck(instructionArgs[0], counter);
          counter = procPoint[1] - 1;
        } else {
          const instructionProcArgs = instructionArgs[1].split(",");
          for (let i = 0; i < instructionProcArgs.length; i++) {
            setVariableMemory(instructionProcArgs[i].trim(), procArgs[i]);
          }
        }
        break;
      }
      case OpCode["}"]: {
        if (procLock) {
            if (procReturnValueTarget) {
                variableMemory.set(procReturnValueTarget, procReturn);
            }
            procLock = false;
            procArgs = [];
            procVariableMemory.clear();
            procReturnValueTarget = null;
            procReturn = 0;
            counter = procLastLocation;
        }
        break;
      }
      case OpCode.CALL: {
        const instructionArgs = instruction.args;
        if (instructionArgs[2] === ">>" && instructionArgs[3]) {
                    procReturnValueTarget = instructionArgs[3];
                }
        
                procLock = true;
                procLastLocation = counter;
        
                const instructionProcArgs = instructionArgs[1].split(",");
                if (instructionProcArgs.length > 0 && instructionProcArgs[0] !== '') {
                    for (let arg of instructionProcArgs) {
                        procArgs.push(variableCheck(arg.trim(), instruction.line));
                    }
                }
        
                counter = procPointCheck(instructionArgs[0], instruction.line)[0] - 1;
                break;
      }
      default:
        throw new Error(`Unknown operation at line ${instruction.line}`);
        break;
    }
    counter++;
  }
  return 0;
}

export function resetVM() {
  variableMemory = new Map<string, number>();
    jumpPoints.clear();
    procPoints.clear();
    buffer = [];
    procLock = false;
    procVariableMemory.clear();
    procArgs = [];
    procLastLocation = 0;
    procReturn = 0;
    procReturnValueTarget = null;
}
