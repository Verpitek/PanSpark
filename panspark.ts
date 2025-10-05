export type OpCodeHandler = (args: string[], context: InterpreterContext) => void;

enum PanSparkType {
  Number,
  String,
  List,
}

type Variable =
  | { type: PanSparkType.Number; value: number }
  | { type: PanSparkType.String; value: string }
  | { type: PanSparkType.List; value: number[] };
  
export const Num = (value: number): Variable => ({ type: PanSparkType.Number, value });
export const Str = (value: string): Variable => ({ type: PanSparkType.String, value });
export const List = (value: number[]): Variable => ({ type: PanSparkType.List, value });

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
  "}",
  
  LIST_CREATE,
  LIST_SET,
  LIST_GET,
  LIST_PUSH,
  LIST_SORT
}

// Optimization: Pre-compiled instruction with resolved indices
interface CompiledInstruction {
  operation: OpCode | string;
  args: string[];
  line: number;
  // Pre-resolved jump target for JUMP/IF operations
  jumpTarget?: number;
  // Cached handler for custom opcodes
  customHandler?: OpCodeHandler;
}

interface Instruction {
  operation: OpCode | string;
  args: string[];
  line: number;
}

export interface InterpreterContext {
  buffer: string[];
  variableMemory: Map<string, Variable>;
  procVariableMemory: Map<string, Variable>;
  procLock: boolean;
  getVar: (name: string, line: number) => Variable;
  setVar: (name: string, value: Variable) => void;
}

// Stack frame for procedure calls
interface ProcStackFrame {
  variableMemory: Map<string, Variable>;
  returnLocation: number;
  returnValueTarget: string | null;
  procStartLine: number;
  procEndLine: number;
  procName: string;
  args: Variable[];
}

// Optimization: Object pooling for stack frames
class FramePool {
  private pool: ProcStackFrame[] = [];
  
  allocate(): ProcStackFrame {
    const frame = this.pool.pop();
    if (frame) {
      frame.variableMemory.clear();
      frame.returnLocation = 0;
      frame.returnValueTarget = null;
      frame.procStartLine = 0;
      frame.procEndLine = 0;
      frame.procName = '';
      frame.args = [];
      return frame;
    }
    return {
      variableMemory: new Map(),
      returnLocation: 0,
      returnValueTarget: null,
      procStartLine: 0,
      procEndLine: 0,
      procName: '',
      args: [],
    };
  }
  
  free(frame: ProcStackFrame): void {
    this.pool.push(frame);
  }
  
  clear(): void {
    this.pool = [];
  }
}

// Optimization: Pre-compiled regex
const TOKEN_REGEX = /"([^"]*)"|\[([^\]]*)\]|\s*>>\s*(\S+)|\(([^)]*)\)|(\S+)/g;

export class PanSparkVM {
  // Instance state
  private jumpPoints: Map<string, number> = new Map();
  private procPoints: Map<string, [number, number]> = new Map();
  private variableMemory: Map<string, Variable> = new Map();
  public buffer: string[] = [];
  
  // Procedure state with pooling
  private procStack: ProcStackFrame[] = [];
  private framePool: FramePool = new FramePool();
  private procReturn: Variable = Num(0);
  private shouldReturn: boolean = false;
  
  // Execution state
  private waitTicks: number = 0;
  private counter: number = 0;
  
  // Custom opcodes
  private customOpCodes: Map<string, OpCodeHandler> = new Map();
  private importedModules: Set<string> = new Set();
  
  // Optimization: Math operation lookup tables (inlined for common ops)
  private binaryMathOps: Map<string, (a: number, b: number) => number> = new Map([
    ["%", (a, b) => a % b],
    ["**", (a, b) => Math.pow(a, b)],
    ["min", (a, b) => Math.min(a, b)],
    ["max", (a, b) => Math.max(a, b)],
  ]);
  
  private unaryMathOps: Map<string, (a: number) => number> = new Map([
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

  constructor() {}

  public registerOpCode(name: string, handler: OpCodeHandler): void {
    this.customOpCodes.set(name.toUpperCase(), handler);
  }

  private get procLock(): boolean {
    return this.procStack.length > 0;
  }

  private get procVariableMemory(): Map<string, Variable> {
    if (this.procStack.length === 0) {
      return new Map();
    }
    return this.procStack[this.procStack.length - 1].variableMemory;
  }

  private getCurrentProcBoundaries(): [number, number] | null {
    if (this.procStack.length === 0) {
      return null;
    }
    const frame = this.procStack[this.procStack.length - 1];
    return [frame.procStartLine, frame.procEndLine];
  }

  private setVariableMemory(variableName: string, value: Variable): void {
    if (this.procLock) {
      this.procVariableMemory.set(variableName, value);
      return;
    }
    this.variableMemory.set(variableName, value);
  }

  private variableCheck(variableName: string, line: number): Variable {
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
      return {
        type: PanSparkType.Number,
        value: numericValue
      }
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

  private safeJumpPointCheck(jumpPointName: string, line: number): number {
    const jumpPoint = this.jumpPointCheck(jumpPointName, line);
    
    if (this.procLock) {
      const boundaries = this.getCurrentProcBoundaries();
      if (boundaries) {
        const [start, end] = boundaries;
        if (jumpPoint < start || jumpPoint > end) {
          const frame = this.procStack[this.procStack.length - 1];
          throw new Error(
            `Cannot jump to "${jumpPointName}" at line ${line}: Jump target is outside procedure "${frame.procName}" scope (procedure spans lines ${start + 1}-${end + 1})`
          );
        }
      }
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

  // Optimization: Single-pass compilation with instruction pre-processing
  public compile(code: string): CompiledInstruction[] {
    let lines = code.split("\n");
    const instructions: CompiledInstruction[] = [];

    this.jumpPoints.clear();
    this.procPoints.clear();

    // Pass 1: Tokenize and create instructions
    for (let counter = 0; counter < lines.length; counter++) {
      let line = lines[counter].trim();
      if (line === "" || line.startsWith("//")) {
        continue;
      }
      
      TOKEN_REGEX.lastIndex = 0; // Reset regex state
      let tokens = [];
      let match;
      
      while ((match = TOKEN_REGEX.exec(line)) !== null) {
        if (match[1] !== undefined) {
          tokens.push(match[1]);
        } else if (match[2] !== undefined) {
          tokens.push(`${match[2]}`);
        } else if (match[3] !== undefined) {
          tokens.push(">>", match[3]);
        } else if (match[4] !== undefined) {
          tokens.push(match[4]);
        } else {
          tokens.push(match[5]);
        }
      }

      if (tokens.length === 0) {
        continue;
      }

      const opName = tokens[0].toUpperCase();
      let operation: OpCode | string | undefined = OpCode[tokens[0].toUpperCase() as keyof typeof OpCode];
      
      if (operation === undefined && this.customOpCodes.has(opName)) {
        operation = opName;
      }
      
      if (operation === undefined) {
        operation = opName;
      }
      
      const compiledInstruction: CompiledInstruction = {
        operation,
        args: tokens.slice(1),
        line: counter + 1,
      };
      
      // Pre-cache custom opcode handler
      if (typeof operation === 'string' && this.customOpCodes.has(operation)) {
        compiledInstruction.customHandler = this.customOpCodes.get(operation);
      }
      
      instructions.push(compiledInstruction);
    }
    
    // Pass 2: Register jump points and procedure boundaries
    let procPoint = {
      name: "",
      startLine: 0,
      endLine: 0
    };
    let procOpen = false;
    
    for (let counter = 0; counter < instructions.length; counter++) {
      const instruction = instructions[counter];
      
      if (instruction.operation === OpCode.POINT) {
        this.jumpPoints.set(instruction.args[0], counter);
      }
      
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
        if (!procOpen) {
          throw new Error(`Unexpected '}' at line ${instruction.line} without matching PROC`);
        }
        procPoint.endLine = counter;
        this.procPoints.set(procPoint.name, [procPoint.startLine, procPoint.endLine]);
        procOpen = false;
      }
    }

    if (procOpen) {
      throw new Error(`Unclosed PROC "${procPoint.name}" starting at line ${procPoint.startLine + 1}`);
    }

    // Pass 3: Pre-resolve jump targets
    for (let i = 0; i < instructions.length; i++) {
      const instruction = instructions[i];
      
      if (instruction.operation === OpCode.JUMP && instruction.args.length > 0) {
        const target = this.jumpPoints.get(instruction.args[0]);
        if (target !== undefined) {
          instruction.jumpTarget = target;
        }
      } else if (instruction.operation === OpCode.IF && instruction.args.length >= 5) {
        const target = this.jumpPoints.get(instruction.args[4]);
        if (target !== undefined) {
          instruction.jumpTarget = target;
        }
      }
    }

    return instructions;
  }

  // Optimization: Inline math operations for common operators
  private executeMath(a: number, b: number, op: string): number {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return a / b;
      default: {
        const binOp = this.binaryMathOps.get(op);
        if (binOp) return binOp(a, b);
        throw new Error(`Unknown binary operator: ${op}`);
      }
    }
  }
  
  private executeUnaryMath(a: number, op: string): number {
    const unaryOp = this.unaryMathOps.get(op);
    if (unaryOp) return unaryOp(a);
    throw new Error(`Unknown unary operator: ${op}`);
  }

  // Optimization: Predictive execution - batch instructions without WAIT
  private shouldBatchExecute(instructions: CompiledInstruction[], startIdx: number): number {
    let batchSize = 0;
    const maxBatch = Math.min(50, instructions.length - startIdx); // Limit batch size
    
    for (let i = 0; i < maxBatch; i++) {
      const inst = instructions[startIdx + i];
      // Stop batching on control flow or WAIT
      if (inst.operation === OpCode.WAIT || 
          inst.operation === OpCode.JUMP ||
          inst.operation === OpCode.IF ||
          inst.operation === OpCode.CALL ||
          inst.operation === OpCode.RETURN ||
          inst.operation === OpCode.END) {
        break;
      }
      batchSize++;
    }
    
    return batchSize;
  }

  public* run(instructions: CompiledInstruction[]) {
    this.counter = 0;
    
    codeloop: while (this.counter < instructions.length) {
      yield this.counter;
      
      if (this.waitTicks > 0) {
        this.waitTicks--;
        break;
      }
      
      const instruction = instructions[this.counter];
      
      if (this.shouldReturn && this.procLock) {
        const boundaries = this.getCurrentProcBoundaries();
        if (boundaries) {
          this.counter = boundaries[1];
          this.shouldReturn = false;
          continue;
        }
      }
      
      // Optimization: Use cached custom handler
      if (typeof instruction.operation === 'string') {
        const handler = instruction.customHandler || this.customOpCodes.get(instruction.operation);
        if (handler) {
          const context: InterpreterContext = {
            buffer: this.buffer,
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
            if (instruction.args.length === 1) {
              if (isNaN(Number(instruction.args[0]))) {
                this.setVariableMemory(instruction.args[0], Num(0));
              } else {
                throw new Error(`Invalid variable name '${instruction.args[0]}' at line ${instruction.line}`);
              }
            } else {
              const value = this.variableCheck(instruction.args[1], instruction.line);
              this.setVariableMemory(instruction.args[0], value);
            }
            break;
          }
          case OpCode.INC: {
            const incValue = this.variableCheck(instruction.args[0], instruction.line);
            if (incValue.type !== PanSparkType.Number) {
              throw new Error(`The provided variable is not a number at line ${instruction.line}`)
            }
            this.setVariableMemory(instruction.args[0], Num(incValue.value + 1));
            break;
          }
          case OpCode.DEC: {
            const decValue = this.variableCheck(instruction.args[0], instruction.line);
            
            if (decValue.type !== PanSparkType.Number) {
              throw new Error(`The provided variable is not a number at line ${instruction.line}`)
            }
            
            this.setVariableMemory(instruction.args[0], Num(decValue.value - 1));
            break;
          }
          case OpCode.LIST_CREATE: {
            const list: number[] = [];
            this.setVariableMemory(instruction.args[0], List(list));
            break;
          }
          case OpCode.LIST_PUSH: {
            const list = this.variableCheck(instruction.args[2], instruction.line);
            const value = this.variableCheck(instruction.args[0], instruction.line);
            
            if (list.type !== PanSparkType.List) {
              throw new Error(`The provided variable is not a list at line ${instruction.line}`)
            }
            if (value.type !== PanSparkType.Number) {
              throw new Error(`The provided value is not a number at line ${instruction.line}`)
            }
            
            list.value.push(value.value);
            this.setVariableMemory(instruction.args[2], list);
            break;
          }
          case OpCode.LIST_GET: {
            const list = this.variableCheck(instruction.args[0], instruction.line);
            const index = this.variableCheck(instruction.args[1], instruction.line);
            
            if (list.type !== PanSparkType.List) {
              throw new Error(`The provided variable is not a list at line ${instruction.line}`)
            }
            if (index.type !== PanSparkType.Number) {
              throw new Error(`The provided index is not a number at line ${instruction.line}`)
            }
            
            const value = list.value[index.value];
            if (value === undefined) {
              throw new Error(`The provided index is out of bounds at line ${instruction.line}`)
            }
            
            this.setVariableMemory(instruction.args[3], Num(value));
            break;
          }
          case OpCode.LIST_SET: {
            const list = this.variableCheck(instruction.args[3], instruction.line);
            const index = this.variableCheck(instruction.args[1], instruction.line);
            const value = this.variableCheck(instruction.args[0], instruction.line);
            
            if (index.type !== PanSparkType.Number) {
              throw new Error(`The provided index is not a number at line ${instruction.line}`)
            }
            
            if (value.type !== PanSparkType.Number) {
              throw new Error(`The provided value is not a number at line ${instruction.line}`)
            }
            
            if (list.type !== PanSparkType.List) {
              throw new Error(`The provided list is not a list at line ${instruction.line}`)
            }
            
            list.value[index.value] = value.value;
            this.setVariableMemory(instruction.args[3], list);
            break;
          }
          case OpCode.LIST_SORT: {
            const list = this.variableCheck(instruction.args[0], instruction.line);
            if (list.type !== PanSparkType.List) {
              throw new Error(`The provided list is not a list at line ${instruction.line}`)
            }
            
            if (instruction.args[1] === "min") {
              list.value.sort((a, b) => a - b);
            } else if (instruction.args[1] === "max") {
              list.value.sort((a, b) => b - a);
            } else {
              throw new Error(`Invalid sort order at line ${instruction.line}`);
            }
            break;
          }
          case OpCode.FREE: {
            if (this.procLock) {
              this.procVariableMemory.delete(instruction.args[0]);
            } else {
              this.variableMemory.delete(instruction.args[0]);
            }
            break;
          }
          case OpCode.MEMDUMP: {
            this.buffer.push(`DUMPING MEMORY at line ${instruction.line}`);
            if (this.procLock) {
              this.buffer.push(`  [PROC "${this.procStack[this.procStack.length - 1].procName}" LOCAL MEMORY - Depth: ${this.procStack.length}]`);
              if (this.procVariableMemory.size === 0) {
                this.buffer.push(`    (empty)`);
              } else {
                for (const [key, value] of this.procVariableMemory.entries()) {
                  this.buffer.push(`    ${key}: ${value.value}`);
                }
              }
            }
            this.buffer.push(`  [GLOBAL MEMORY]`);
            if (this.variableMemory.size === 0) {
              this.buffer.push(`    (empty)`);
            } else {
              for (const [key, value] of this.variableMemory.entries()) {
                this.buffer.push(`    ${key}: ${value.value}`);
              }
            }
            this.buffer.push("END OF MEMORY DUMP");
            break;
          }
          case OpCode.NOP: {
            break;
          }
          case OpCode.TICK: {
            this.setVariableMemory(instruction.args[0], Num(this.counter));
            break;
          }
          case OpCode.PRINT: {
            const printVar = this.variableCheck(instruction.args[0], instruction.line);
            if (printVar.type === PanSparkType.Number) {
              this.buffer.push(printVar.value.toString());
            } else if (printVar.type === PanSparkType.String) {
              this.buffer.push(printVar.value);
            } else if (printVar.type === PanSparkType.List) {
              this.buffer.push("[" + printVar.value.toString()+"]");
            }
            break;
          }
          case OpCode.ECHO: {
            this.buffer.push(instruction.args[0].toString());
            break;
          }
          case OpCode.MATH: {
            const instructionArgs = instruction.args;
            const line = instruction.line;
            const op = instructionArgs[1];
            let result: number;
            let destVariable: string;
        
            // Check if it's a binary operator
            if (op === '+' || op === '-' || op === '*' || op === '/' || 
                op === '%' || op === '**' || op === 'min' || op === 'max') {
              if (instructionArgs.length !== 5 || instructionArgs[3] !== ">>") {
                throw new Error(`Invalid syntax for binary math operation at line ${line}. Expected: MATH var1 op var2 >> result`);
              }
              const arg1 = this.variableCheck(instructionArgs[0], line);
              const arg2 = this.variableCheck(instructionArgs[2], line);
              destVariable = instructionArgs[4];
                
              if (arg1.type === PanSparkType.Number && arg2.type === PanSparkType.Number) {
                result = this.executeMath(arg1.value, arg2.value, op);
              } else {
                throw new Error(`The provided variable is not a number at line ${instruction.line}`)
              }
            } else {
              // Unary operator
              if (instructionArgs.length !== 4 || instructionArgs[2] !== ">>") {
                throw new Error(`Invalid syntax for unary math operation at line ${line}. Expected: MATH var1 op >> result`);
              }
              const arg1 = this.variableCheck(instructionArgs[0], line);
              destVariable = instructionArgs[3];
        
              if (arg1.type === PanSparkType.Number) {
                result = this.executeUnaryMath(arg1.value, op);
              } else {
                throw new Error(`The provided variable is not a number at line ${instruction.line}`)
              }
            }
        
            if (Number.isNaN(result)) {
              throw new Error(`Math operation resulted in NaN at line ${line}. Check for invalid inputs like sqrt(-1) or 0/0.`);
            } else {
              this.setVariableMemory(destVariable, Num(result));
            }
            break;
          }
          case OpCode.IF: {
            const instructionArgs = instruction.args;
            const argument1 = this.variableCheck(instructionArgs[0], instruction.line);
            const argument2 = this.variableCheck(instructionArgs[2], instruction.line);
            
            let val1: number;
            let val2: number;
            
            if (argument1.type === PanSparkType.Number) {
              val1 = argument1.value;
            } else {
              throw new Error(`Cannot compare non-numeric value at line ${instruction.line}`);
            }
            
            if (argument2.type === PanSparkType.Number) {
              val2 = argument2.value;
            } else {
              throw new Error(`Cannot compare non-numeric value at line ${instruction.line}`);
            }
            
            let check = false;
            // Optimization: Inline comparison operators
            switch (instructionArgs[1]) {
              case '>': check = val1 > val2; break;
              case '<': check = val1 < val2; break;
              case '==': check = val1 == val2; break;
              case '!=': check = val1 != val2; break;
              case '>=': check = val1 >= val2; break;
              case '<=': check = val1 <= val2; break;
              default:
                throw new Error(`Invalid comparison operator "${instructionArgs[1]}" at line ${instruction.line}`);
            }
            
            if (check) {
              // Use pre-resolved jump target if available
              if (instruction.jumpTarget !== undefined) {
                this.counter = instruction.jumpTarget - 1;
              } else {
                this.counter = this.safeJumpPointCheck(instructionArgs[4], instruction.line) - 1;
              }
            }
            break;
          }
          case OpCode.END: {
            break codeloop;
          }
          case OpCode.JUMP: {
            // Use pre-resolved jump target if available
            if (instruction.jumpTarget !== undefined) {
              this.counter = instruction.jumpTarget - 1;
            } else {
              const jumpPoint = this.safeJumpPointCheck(instruction.args[0], instruction.line);
              this.counter = jumpPoint - 1;
            }
            break;
          }
          case OpCode.RETURN: {
            if (this.procLock) {
              if (instruction.args.length > 0) {
                this.procReturn = this.variableCheck(instruction.args[0], instruction.line);
              } else {
                this.procReturn = Num(0);
              }
              this.shouldReturn = true;
            } else {
              throw new Error(`RETURN can only be used inside a procedure at line ${instruction.line}`);
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
              const paramString = instructionArgs[1] || "";
              const instructionProcArgs = paramString.trim() === "" ? [] : paramString.split(",").map(s => s.trim());
              const currentFrame = this.procStack[this.procStack.length - 1];
              const frameArgs = currentFrame.args;
              
              if (frameArgs.length !== instructionProcArgs.length) {
                throw new Error(
                  `Procedure "${currentFrame.procName}" expects ${instructionProcArgs.length} arguments but received ${frameArgs.length} at line ${instruction.line}`
                );
              }
              
              for (let i = 0; i < instructionProcArgs.length; i++) {
                this.procVariableMemory.set(instructionProcArgs[i], frameArgs[i]);
              }
            }
            break;
          }
          case OpCode["}"]: {
            if (this.procLock) {
              const frame = this.procStack.pop()!;
              
              if (frame.returnValueTarget) {
                this.variableMemory.set(frame.returnValueTarget, this.procReturn);
              }
              
              this.procReturn = Num(0);
              this.shouldReturn = false;
              
              // Optimization: Return frame to pool
              this.framePool.free(frame);
              
              this.counter = frame.returnLocation;
            }
            break;
          }
          case OpCode.CALL: {
            const instructionArgs = instruction.args;
            
            if (instructionArgs.length < 2) {
              throw new Error(`Invalid CALL syntax at line ${instruction.line}. Expected: CALL procName (args) or CALL procName (args) >> result`);
            }
            
            const procName = instructionArgs[0];
            const procPoint = this.procPointCheck(procName, instruction.line);
            
            let returnValueTarget: string | null = null;
            if (instructionArgs.length > 2 && instructionArgs[2] === ">>" && instructionArgs[3]) {
              returnValueTarget = instructionArgs[3];
            }
            
            const argString = instructionArgs[1] || "";
            const procArgStrings = argString.trim() === "" ? [] : argString.split(",").map(s => s.trim());
            const procArgs: Variable[] = [];
            
            for (let arg of procArgStrings) {
              if (arg !== '') {
                procArgs.push(this.variableCheck(arg, instruction.line));
              }
            }
            
            // Optimization: Get frame from pool
            const newFrame = this.framePool.allocate();
            newFrame.returnLocation = this.counter;
            newFrame.returnValueTarget = returnValueTarget;
            newFrame.procStartLine = procPoint[0];
            newFrame.procEndLine = procPoint[1];
            newFrame.procName = procName;
            newFrame.args = procArgs;
            
            this.procStack.push(newFrame);
            this.counter = procPoint[0] - 1;
            break;
          }
          case OpCode.WAIT: {
            const instructionArgs = instruction.args;
            if (instructionArgs[0]) {
              const amount = this.variableCheck(instructionArgs[0], instruction.line)
              if (amount.type === PanSparkType.Number) {
                this.waitTicks = Math.floor(amount.value);
              } else {
                throw new Error(`WAIT requires a numeric value at line ${instruction.line}`);
              }
            }
            break;
          }
          case OpCode.IMPORT: {
            const moduleName = instruction.args[0];
            
            if (this.importedModules.has(moduleName)) {
              this.buffer.push(`Module '${moduleName}' already imported`);
              break;
            }
            
            this.buffer.push(`Module '${moduleName}' imported successfully`);
            this.importedModules.add(moduleName);
            break;
          }
          default:
            throw new Error(`Unknown operation ${instruction.operation} at line ${instruction.line}`);
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
    this.procStack = [];
    this.framePool.clear();
    this.procReturn = Num(0);
    this.shouldReturn = false;
    this.waitTicks = 0;
    this.counter = 0;
    this.importedModules.clear();
  }

  public getBuffer(): string[] {
    return this.buffer;
  }

  public getVariableMemory(): Map<string, Variable> {
    return this.variableMemory;
  }

  public loadModule(moduleName: string, moduleExports: any): void {
    if (this.importedModules.has(moduleName)) {
      return;
    }
    
    if (moduleExports && typeof moduleExports.registerWith === 'function') {
      moduleExports.registerWith(this);
      this.importedModules.add(moduleName);
    } else {
      throw new Error(`Module '${moduleName}' does not export a registerWith function`);
    }
  }
}

export function createVM(): PanSparkVM {
  return new PanSparkVM();
}