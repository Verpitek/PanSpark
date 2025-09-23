export type OpCodeHandler = (args: string[], context: InterpreterContext) => void;

enum OpCode {
  SET,
  MATH,
  PRINT,
  ECHO,
  POINT,
  JUMP,
  IF,
  END,
  RETURN,
  CALL,
  PROC,
  WAIT,
  INC,
  DEC,
  FREE,
  NOP,
  MEMDUMP,
  TICK,
  IMPORT,
  "}"
}

interface Instruction {
  operation: OpCode | string;
  args: string[];
  line: number;
}

export interface InterpreterContext {
  variableMemory: Map<string, number>;
  procVariableMemory: Map<string, number>;
  procLock: boolean;
  getVar: (name: string, line: number) => number;
  setVar: (name: string, value: number) => void;
}

export class PanSparkVM {
  // Instance state - each VM has its own state
  private jumpPoints: Map<string, number> = new Map();
  private procPoints: Map<string, [number, number]> = new Map();
  private variableMemory: Map<string, number> = new Map();
  public buffer: string[] = [];
  
  // Procedure state
  private procLock: boolean = false;
  private procVariableMemory: Map<string, number> = new Map();
  private procArgs: number[] = [];
  private procLastLocation: number = 0;
  private procReturn: number = 0;
  private procReturnValueTarget: string | null = null;
  
  // Execution state
  private waitTicks: number = 0;
  private counter: number = 0;
  
  // Custom opcodes for this instance
  private customOpCodes: Map<string, OpCodeHandler> = new Map();
  private importedModules: Set<string> = new Set();

  constructor() {
    // Initialize with any default opcodes if needed
  }

  public registerOpCode(name: string, handler: OpCodeHandler): void {
    this.customOpCodes.set(name.toUpperCase(), handler);
  }

  private setVariableMemory(variableName: string, value: number): void {
    if (this.procLock) {
      this.procVariableMemory.set(variableName, value);
      return;
    }
    this.variableMemory.set(variableName, value);
  }

  private variableCheck(variableName: string, line: number): number {
    if (this.procLock) {
      const procValue = this.procVariableMemory.get(variableName);
      if (procValue !== undefined) {
        return procValue;
      }
    }

    const globalValue = this.variableMemory.get(variableName);
    if (globalValue !== undefined) {
      return globalValue;
    }

    const numericValue = Number(variableName);
    if (!isNaN(numericValue)) {
      return numericValue;
    }

    throw new Error(`Variable "${variableName}" is not defined at line ${line}`);
  }

  private jumpPointCheck(jumpPointName: string, line: number): number {
    const jumpPoint = this.jumpPoints.get(jumpPointName);
    if (jumpPoint === undefined) {
      throw new Error(`Jump point "${jumpPointName}" is not defined at line ${line}.`);
    }
    return jumpPoint;
  }

  private procPointCheck(procName: string, line: number): [number, number] {
    const procPoint = this.procPoints.get(procName);
    if (procPoint === undefined) {
      throw new Error(`Proc "${procName}" is not defined at line ${line}.`);
    }
    return procPoint;
  }

  public compile(code: string): Instruction[] {
    let lines = code.split("\n");
    const instructions: Instruction[] = [];

    // Clear previous compilation state
    this.jumpPoints.clear();
    this.procPoints.clear();

    for (let counter = 0; counter < lines.length; counter++) {
      let line = lines[counter].trim();
      if (line === "" || line.startsWith("//")) {
        continue;
      }
      
      const regex = /"([^"]*)"|\[([^\]]*)\]|\s*>>\s*(\S+)|\(([^)]*)\)|(\S+)/g;
      let tokens = [];
      let match;
      
      while ((match = regex.exec(line)) !== null) {
        if (match[1] !== undefined) {
          tokens.push(match[1]); // String without quotes
        } else if (match[2] !== undefined) {
          tokens.push(`${match[2]}`); // Content within brackets
        } else if (match[3] !== undefined) {
          tokens.push(">>", match[3]); // >> operator
        } else if (match[4] !== undefined) {
          tokens.push(match[4]); // Parentheses content
        } else {
          tokens.push(match[5]); // Regular token
        }
      }

      const opName = tokens[0].toUpperCase();
      let operation: OpCode | string | undefined = OpCode[tokens[0].toUpperCase() as keyof typeof OpCode];
      
      if (operation === undefined && this.customOpCodes.has(opName)) {
        operation = opName; // Use the string name for the custom opcode
      }
      
      // If it's still undefined, treat it as a potential runtime opcode
      if (operation === undefined) {
        operation = opName; // Store as string for runtime resolution
      }
              
      instructions.push({
        operation,
        args: tokens.slice(1),
        line: counter + 1,
      });
    }
    
    // Register jump points
    for (let counter = 0; counter < instructions.length; counter++) {
      const instruction = instructions[counter];
      if (instruction.operation === OpCode.POINT) {
        this.jumpPoints.set(instruction.args[0], counter);
      }
    }
    
    // Register procedure points
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
        this.procPoints.set(procPoint.name, [procPoint.startLine, procPoint.endLine]);
        procOpen = false;
      }
    }

    return instructions;
  }

  public* run(instructions: Instruction[]) {
    this.counter = 0;
    
    codeloop: while (this.counter < instructions.length) {
      yield this.counter;
      
      if (this.waitTicks > 0) {
        this.waitTicks--;
        break;
      }
      
      const instruction = instructions[this.counter];
      
      if (typeof instruction.operation === 'string') {
        const handler = this.customOpCodes.get(instruction.operation);
        if (handler) {
          // Create the context object to pass to the handler
          const context: InterpreterContext = {
            variableMemory: this.variableMemory,
            procVariableMemory: this.procVariableMemory,
            procLock: this.procLock,
            getVar: (name, line) => this.variableCheck(name, line),
            setVar: (name, value) => this.setVariableMemory(name, value),
          };
          handler(instruction.args, context);
        } else {
          throw new Error(`Unknown opcode '${instruction.operation}' at line ${instruction.line}. Make sure the required module is imported.`);
        }
      } else {
        switch (instruction.operation) {
          case OpCode.SET: {
            const value = this.variableCheck(
              instruction.args[0],
              instruction.line,
            );
            this.setVariableMemory(instruction.args[2], value);
            break;
          }
          case OpCode.INC: {
            const value = this.variableCheck(
              instruction.args[0],
              instruction.line,
            );
            this.setVariableMemory(instruction.args[0], value + 1);
            break;
          }
          case OpCode.DEC: {
            const value = this.variableCheck(
              instruction.args[0],
              instruction.line,
            );
            this.setVariableMemory(instruction.args[0], value - 1);
            break;
          }
          case OpCode.FREE: {
            this.variableMemory.delete(instruction.args[0]);
            break;
          }
          case OpCode.MEMDUMP: {
            this.buffer.push(`DUMPING MEMORY at line ${instruction.line}`);
            for (const [key, value] of this.variableMemory.entries()) {
              this.buffer.push(`${key}: ${value}`);
            }
            this.buffer.push("END OF MEMORY DUMP");
            break;
          }
          case OpCode.NOP: {
            break;
          }
          case OpCode.TICK: {
            this.setVariableMemory(instruction.args[0], this.counter);
            break;
          }
          case OpCode.PRINT: {
            const printVar = this.variableCheck(
              instruction.args[0],
              instruction.line,
            );
            if (Number.isNaN(printVar)) {
              throw new Error(
                "Invalid print operation at line " + instruction.line,
              );
            } else {
              this.buffer.push(printVar.toString());
            }
            break;
          }
          case OpCode.ECHO: {
            const echoArg = instruction.args[0];
            this.buffer.push(echoArg.toString());
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
              ["log", (a) => Math.log(a)],
              ["floor", (a) => Math.floor(a)],
              ["ceil", (a) => Math.ceil(a)],
              ["sin", (a) => Math.sin(a)],
              ["rand", (max) => Math.random() * max],
              ["cos", (a) => Math.cos(a)],
              ["tan", (a) => Math.tan(a)],
              ["abs", (a) => Math.abs(a)],
              ["round", (a) => Math.round(a)],
              ["log10", (a) => Math.log10(a)],
              ["exp", (a) => Math.exp(a)],
            ]);
        
            const op = instructionArgs[1];
            let result: number;
            let destVariable: string;
        
            if (binaryOperators.has(op)) {
              if (instructionArgs.length !== 5 || instructionArgs[3] !== ">>") {
                throw new Error(`Invalid syntax for binary math operation at line ${line}. Expected: MATH var1 op var2 >> result`);
              }
              const arg1 = this.variableCheck(instructionArgs[0], line);
              const arg2 = this.variableCheck(instructionArgs[2], line);
              destVariable = instructionArgs[4];
                
              const operation = binaryOperators.get(op)!;
              result = operation(arg1, arg2);
        
            } else if (unaryOperators.has(op)) {
              if (instructionArgs.length !== 4 || instructionArgs[2] !== ">>") {
                throw new Error(`Invalid syntax for unary math operation at line ${line}. Expected: MATH var1 op >> result`);
              }
              const arg1 = this.variableCheck(instructionArgs[0], line);
              destVariable = instructionArgs[3];
        
              const operation = unaryOperators.get(op)!;
              result = operation(arg1);
        
            } else {
              throw new Error(`Unknown math operator "${op}" at line ${line}`);
            }
        
            if (Number.isNaN(result)) {
              throw new Error(`Math operation resulted in NaN at line ${line}. Check for invalid inputs like sqrt(-1) or 0/0.`);
            } else {
              this.setVariableMemory(destVariable, result);
            }
        
            break;
          }
          case OpCode.IF: {
            const instructionArgs = instruction.args;
            const argument1 = this.variableCheck(instructionArgs[0], instruction.line);
            const argument2 = this.variableCheck(instructionArgs[2], instruction.line);
            let check = false;
            switch (instructionArgs[1]) {
              case ">": check = argument1 > argument2; break;
              case "<": check = argument1 < argument2; break;
              case "==": check = argument1 == argument2; break;
              case "!=": check = argument1 != argument2; break;
              case ">=": check = argument1 >= argument2; break;
              case "<=": check = argument1 <= argument2; break;
              default:
                throw new Error(`Invalid comparison operator at line ${instruction.line}`);
            }
            if (check) {
              this.counter = this.jumpPointCheck(instructionArgs[4], instruction.line) - 1;
            }
            break;
          }
          case OpCode.END: {
            break codeloop;
          }
          case OpCode.JUMP: {
            const procPoint = this.jumpPointCheck(instruction.args[0], this.counter);
            this.counter = procPoint - 1;
            break;
          }
          case OpCode.RETURN: {
            if (this.procLock) {
              if (instruction.args.length > 0) {
                this.procReturn = this.variableCheck(instruction.args[0], instruction.line);
              }
            }
            break;
          }
          case OpCode.POINT: {
            break;
          }
          case OpCode.PROC: {
            const instructionArgs = instruction.args;
            if (!this.procLock) {
              const procPoint = this.procPointCheck(instructionArgs[0], this.counter);
              this.counter = procPoint[1] - 1;
            } else {
              const instructionProcArgs = instructionArgs[1].split(",");
              for (let i = 0; i < instructionProcArgs.length; i++) {
                this.setVariableMemory(instructionProcArgs[i].trim(), this.procArgs[i]);
              }
            }
            break;
          }
          case OpCode["}"]: {
            if (this.procLock) {
              if (this.procReturnValueTarget) {
                this.variableMemory.set(this.procReturnValueTarget, this.procReturn);
              }
              this.procLock = false;
              this.procArgs = [];
              this.procVariableMemory.clear();
              this.procReturnValueTarget = null;
              this.procReturn = 0;
              this.counter = this.procLastLocation;
            }
            break;
          }
          case OpCode.CALL: {
            const instructionArgs = instruction.args;
            if (instructionArgs[2] === ">>" && instructionArgs[3]) {
              this.procReturnValueTarget = instructionArgs[3];
            }
          
            this.procLock = true;
            this.procLastLocation = this.counter;
          
            const instructionProcArgs = instructionArgs[1].split(",");
            if (instructionProcArgs.length > 0 && instructionProcArgs[0] !== '') {
              for (let arg of instructionProcArgs) {
                this.procArgs.push(this.variableCheck(arg.trim(), instruction.line));
              }
            }
          
            this.counter = this.procPointCheck(instructionArgs[0], instruction.line)[0] - 1;
            break;
          }
          case OpCode.WAIT: {
            const instructionArgs = instruction.args;
            if (instructionArgs[0]) {
              this.waitTicks = this.variableCheck(instructionArgs[0], instruction.line);
            }
            break;
          }
          case OpCode.IMPORT: {
            const moduleName = instruction.args[0];
            
            if (this.importedModules.has(moduleName)) {
              this.buffer.push(`Module '${moduleName}' already imported`);
              break;
            }
            
            // For now, we'll handle imports synchronously by expecting pre-loaded modules
            // This is a limitation of the current synchronous architecture
            this.buffer.push(`Module '${moduleName}' imported successfully`);
            this.importedModules.add(moduleName);
            break;
          }
          default:
            throw new Error(`Unknown operation at line ${instruction.line}`);
        }
      }
      this.counter++;
    }
    return 0;
  }

  public resetVM(): void {
    this.variableMemory.clear();
    this.jumpPoints.clear();
    this.procPoints.clear();
    this.buffer = [];
    this.procLock = false;
    this.procVariableMemory.clear();
    this.procArgs = [];
    this.procLastLocation = 0;
    this.procReturn = 0;
    this.procReturnValueTarget = null;
    this.waitTicks = 0;
    this.counter = 0;
    this.importedModules.clear();
  }

  // Helper methods for backward compatibility
  public getBuffer(): string[] {
    return this.buffer;
  }

  public getVariableMemory(): Map<string, number> {
    return this.variableMemory;
  }

  // Load a module programmatically
  public loadModule(moduleName: string, moduleExports: any): void {
    if (this.importedModules.has(moduleName)) {
      return; // Already loaded
    }
    
    if (moduleExports && typeof moduleExports.registerWith === 'function') {
      moduleExports.registerWith(this);
      this.importedModules.add(moduleName);
    } else {
      throw new Error(`Module '${moduleName}' does not export a registerWith function`);
    }
  }
}

// Backward compatibility exports
export function createVM(): PanSparkVM {
  return new PanSparkVM();
}