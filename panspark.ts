export type OpCodeHandler = (args: string[], context: InterpreterContext) => void;

// works... just barely
function generateUUID() {
  var chars = '0123456789abcdef';
  var uuid = '';
  var i = 0;
  while (i < 36) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4';
    } else if (i === 19) {
      var n = Math.floor(Math.random() * 4);
      uuid += chars[n + 8];
    } else {
      var n = Math.floor(Math.random() * 16);
      uuid += chars[n];
    }
    i++;
  }
  
  return uuid;
}


// the types are mostly used for devs :3
enum PanSparkType {
  Number,
  String,
  List,
  Struct,
}

type StructField = {
  type: 'number' | 'string' | 'list';
};

type StructDefinition = {
  name: string;
  fields: Map<string, StructField>;
};

type StructInstance = {
  structName: string;
  data: Map<string, Variable>;
};

type Variable =
  | { type: PanSparkType.Number; value: number }
  | { type: PanSparkType.String; value: string }
  | { type: PanSparkType.List; value: number[] }
  | { type: PanSparkType.Struct; value: StructInstance };
  
export const Num = (value: number): Variable => ({ type: PanSparkType.Number, value });
export const Str = (value: string): Variable => ({ type: PanSparkType.String, value });
export const List = (value: number[]): Variable => ({ type: PanSparkType.List, value });
export const Struct = (value: StructInstance): Variable => ({ type: PanSparkType.Struct, value });

enum OpCode {
  SET,
  MATH,
  PRINT,
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
  MEMSTATS,
  TICK,
  ENDPROC,
  FOR,
  ENDFOR,
  BREAK,
  CONTINUE,
  
   LIST_CREATE,
   LIST_SET,
   LIST_GET,
   LIST_PUSH,
   LIST_SORT,
   LIST_LENGTH,
   LIST_REVERSE,
   LIST_FIND,
   LIST_INDEX_OF,
   LIST_CONTAINS,
   LIST_REMOVE,
   
   CONCAT,
   STRLEN,
   SUBSTR,
   STR_UPPER,
   STR_LOWER,
   STR_TRIM,
   STR_REPLACE,
   STR_CONTAINS,
   STR_CHAR,
   
    TYPEOF,
    TRY,
    CATCH,
    ENDTRY,
    THROW,
    
    STRUCT,
    STRUCTEND,
    STRUCT_GET,
    STRUCT_SET,
}

// Pre-compiled instruction with resolved indices
interface CompiledInstruction {
  operation: OpCode | string;
  args: string[];
  line: number;
  // Pre-resolved jump target for JUMP/IF operations
  jumpTarget?: number;
  // Cached handler for custom opcodes
  customHandler?: OpCodeHandler;
  // Pre-computed ENDFOR index for FOR loops (optimization)
  endForIndex?: number;
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

// Object pooling for stack frames
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

// ============ EXPRESSION AST STRUCTURES ============

// AST Node types for expression evaluation
interface ASTNode {
  type: 'number' | 'variable' | 'binary' | 'unary';
}

interface NumberNode extends ASTNode {
  type: 'number';
  value: number;
}

interface VariableNode extends ASTNode {
  type: 'variable';
  name: string;
}

interface BinaryOpNode extends ASTNode {
  type: 'binary';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

interface UnaryOpNode extends ASTNode {
  type: 'unary';
  operator: string;
  operand: ASTNode;
}

type ExpressionNode = NumberNode | VariableNode | BinaryOpNode | UnaryOpNode;

// Expression tokenizer for AST parser
class ExpressionTokenizer {
  private input: string;
  private position: number = 0;
  private tokens: Array<{ type: string; value: string }> = [];

  constructor(input: string) {
    this.input = input;
    this.tokenize();
  }

  private tokenize(): void {
    while (this.position < this.input.length) {
      const char = this.input[this.position];

      // Skip whitespace
      if (/\s/.test(char)) {
        this.position++;
        continue;
      }

      // Numbers
      if (/\d/.test(char)) {
        let num = '';
        while (this.position < this.input.length && /[\d.]/.test(this.input[this.position])) {
          num += this.input[this.position];
          this.position++;
        }
        this.tokens.push({ type: 'NUMBER', value: num });
        continue;
      }

      // Identifiers (variable names)
      if (/[a-zA-Z_]/.test(char)) {
        let ident = '';
        while (this.position < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.position])) {
          ident += this.input[this.position];
          this.position++;
        }
        this.tokens.push({ type: 'IDENT', value: ident });
        continue;
      }

      // Operators and punctuation
      const twoCharOp = this.input.substr(this.position, 2);
      if (twoCharOp === '**' || twoCharOp === '==' || twoCharOp === '!=' || twoCharOp === '<=' || twoCharOp === '>=') {
        this.tokens.push({ type: 'OP', value: twoCharOp });
        this.position += 2;
        continue;
      }

      const singleChar = this.input[this.position];
      if ('+-*/%()'.includes(singleChar)) {
        this.tokens.push({ type: singleChar === '(' ? 'LPAREN' : singleChar === ')' ? 'RPAREN' : 'OP', value: singleChar });
        this.position++;
        continue;
      }

      throw new Error(`Unexpected character: ${singleChar} at position ${this.position}`);
    }

    this.tokens.push({ type: 'EOF', value: '' });
  }

  getTokens(): Array<{ type: string; value: string }> {
    return this.tokens;
  }
}

// Recursive descent parser for expressions with operator precedence
class ExpressionParser {
  private tokens: Array<{ type: string; value: string }>;
  private current: number = 0;

  constructor(input: string) {
    const tokenizer = new ExpressionTokenizer(input);
    this.tokens = tokenizer.getTokens();
  }

  parse(): ExpressionNode {
    return this.parseExpression();
  }

  private parseExpression(): ExpressionNode {
    return this.parseAdditive();
  }

  // Lowest precedence: + and -
  private parseAdditive(): ExpressionNode {
    let left = this.parseMultiplicative();

    while (this.peek().value === '+' || this.peek().value === '-') {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      left = { type: 'binary', operator: op, left, right } as BinaryOpNode;
    }

    return left;
  }

  // Medium precedence: *, /, %
  private parseMultiplicative(): ExpressionNode {
    let left = this.parsePower();

    while (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%') {
      const op = this.advance().value;
      const right = this.parsePower();
      left = { type: 'binary', operator: op, left, right } as BinaryOpNode;
    }

    return left;
  }

  // Higher precedence: **
  private parsePower(): ExpressionNode {
    let left = this.parseUnary();

    // Power is right-associative: 2**3**2 = 2**(3**2) = 512
    if (this.peek().value === '**') {
      const op = this.advance().value;
      const right = this.parsePower(); // Recursive call for right-associativity
      left = { type: 'binary', operator: op, left, right } as BinaryOpNode;
    }

    return left;
  }

  // Unary operators: -, +
  private parseUnary(): ExpressionNode {
    if (this.peek().value === '-' || this.peek().value === '+') {
      const op = this.advance().value;
      const operand = this.parseUnary(); // Right associative
      return { type: 'unary', operator: op, operand } as UnaryOpNode;
    }

    return this.parsePrimary();
  }

  // Highest precedence: numbers, variables, parentheses
  private parsePrimary(): ExpressionNode {
    const token = this.peek();

    // Numbers
    if (token.type === 'NUMBER') {
      this.advance();
      return { type: 'number', value: parseFloat(token.value) } as NumberNode;
    }

    // Variables
    if (token.type === 'IDENT') {
      const name = this.advance().value;
      return { type: 'variable', name } as VariableNode;
    }

    // Parenthesized expressions
    if (token.type === 'LPAREN') {
      this.advance();
      const expr = this.parseExpression();
      if (this.peek().type !== 'RPAREN') {
        throw new Error('Expected ) after expression');
      }
      this.advance();
      return expr;
    }

    throw new Error(`Unexpected token: ${token.value} (type: ${token.type})`);
  }

  private peek() {
    return this.tokens[this.current];
  }

  private advance() {
    return this.tokens[this.current++];
  }
}

// Pre-compiled regex
// Updated regex to support escape sequences in strings
// Note: Parentheses are captured to support both CALL syntax and expression parsing
// Also handles dot notation for struct field access (var.field)
const TOKEN_REGEX = /"((?:\\.|[^"\\])*)"|\[([^\]]*)\]|\s*>>\s*(\S+)|\(([^)]*)\)|(\S+)/g;

// Helper function to process escape sequences in strings
function processEscapeSequences(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\x00') // Temporary placeholder for backslash
    .replace(/\\"/g, '"')
    .replace(/\x00/g, '\\'); // Replace placeholder with actual backslash
}

export class PanSparkVM {
  // Instance state
  private jumpPoints: Map<string, number> = new Map();
  private procPoints: Map<string, [number, number]> = new Map();
  private variableMemory: Map<string, Variable> = new Map();
  public uuid: string = generateUUID();
  public buffer: string[] = [];
  
  // Optional variable count limit (null = unlimited)
  private maxVariableCount: number | null = null;
  private debugMode: boolean = false;
  
   // Procedure state with pooling
   private procStack: ProcStackFrame[] = [];
   private forStack: Array<{ varName: string; endValue: number; forStartLine: number; endForLine: number; step: number }> = [];
   private framePool: FramePool = new FramePool();
   private procReturn: Variable = Num(0);
   private shouldReturn: boolean = false;
   
   // TRY-CATCH state for error handling
   private tryStack: Array<{ startLine: number; catchLine: number; endLine: number; errorVariable: string | null; errorOccurred: boolean }> = [];
   private lastError: string = "";
  
  // Execution state
  private waitTicks: number = 0;
  private counter: number = 0;
  
  // Custom opcodes
  private customOpCodes: Map<string, OpCodeHandler> = new Map();
  private importedModules: Set<string> = new Set();
  
  // Struct state
  private structDefinitions: Map<string, StructDefinition> = new Map();
  private currentStructDef: StructDefinition | null = null;
  private inStructDef: boolean = false;
  
  // Math operation lookup tables (inlined for common ops)
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
  
   private evaluateExpression(expression: string, line: number): number {
     // Use the new AST-based evaluator (single-pass, cleaner, more maintainable)
     return this.evaluateExpressionAST(expression, line);
   }

   /**
    * New AST-based expression evaluator (single-pass, cleaner)
    * Replaces the old multi-pass evaluator with proper precedence parsing
    */
   private evaluateExpressionAST(expression: string, line: number): number {
     try {
       const parser = new ExpressionParser(expression);
       const ast = parser.parse();
       return this.evaluateASTNode(ast, line);
     } catch (err) {
       const errorMsg = err instanceof Error ? err.message : String(err);
       throw new Error(`Expression evaluation error at line ${line}: ${errorMsg}`);
     }
   }

   /**
    * Recursively evaluate an AST node
    */
   private evaluateASTNode(node: ExpressionNode, line: number): number {
     switch (node.type) {
       case 'number':
         return (node as NumberNode).value;

       case 'variable': {
         const varNode = node as VariableNode;
         const variable = this.variableCheck(varNode.name, line);
         if (variable.type !== PanSparkType.Number) {
           throw new Error(`Variable "${varNode.name}" is not a number`);
         }
         return variable.value;
       }

       case 'unary': {
         const unaryNode = node as UnaryOpNode;
         const operand = this.evaluateASTNode(unaryNode.operand, line);
         
         if (unaryNode.operator === '-') {
           return -operand;
         } else if (unaryNode.operator === '+') {
           return operand;
         }
         throw new Error(`Unknown unary operator: ${unaryNode.operator}`);
       }

       case 'binary': {
         const binaryNode = node as BinaryOpNode;
         const left = this.evaluateASTNode(binaryNode.left, line);
         const right = this.evaluateASTNode(binaryNode.right, line);

         switch (binaryNode.operator) {
           case '+': return left + right;
           case '-': return left - right;
           case '*': return left * right;
           case '/':
             if (right === 0) throw new Error(`Division by zero`);
             return left / right;
           case '%': return left % right;
           case '**': return Math.pow(left, right);
           default:
             throw new Error(`Unknown binary operator: ${binaryNode.operator}`);
         }
       }

       default:
         throw new Error(`Unknown AST node type`);
     }
   }

   public registerOpCode(name: string, handler: OpCodeHandler): void {
     this.customOpCodes.set(name.toUpperCase(), handler);
   }

   /**
    * Set maximum variable count limit
    * @param limit Maximum number of unique variables allowed (null for unlimited)
    */
   public setMaxVariableCount(limit: number | null): void {
     this.maxVariableCount = limit;
   }

   /**
    * Get current variable count limit
    */
   public getMaxVariableCount(): number | null {
     return this.maxVariableCount;
   }

   /**
    * Get current variable count
    */
   public getVariableCount(): number {
     return this.variableMemory.size + (this.procStack.length > 0 ? this.procVariableMemory.size : 0);
   }

   /**
    * Enable/disable debug/trace mode
    */
   public setDebugMode(enabled: boolean): void {
     this.debugMode = enabled;
   }

   /**
    * Check if debug mode is enabled
    */
   public isDebugMode(): boolean {
     return this.debugMode;
   }

   private getCallStack(): string {
     if (this.procStack.length === 0) {
       return 'Global scope';
     }
     
     const callChain = this.procStack.map((frame, index) => {
       const indent = '  '.repeat(index);
       return `${indent}→ ${frame.procName} (line ${frame.procStartLine + 1})`;
     }).join('\n');
     
     return `Call stack:\n${callChain}`;
   }

   private enhanceErrorMessage(baseMessage: string, line: number): string {
     const callStack = this.getCallStack();
     return `${baseMessage}\n${callStack}`;
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
    const targetMap = this.procLock ? this.procVariableMemory : this.variableMemory;
    
    // Check variable count limit (only if creating new variable)
    if (this.maxVariableCount !== null && !targetMap.has(variableName)) {
      const currentCount = this.variableMemory.size + this.procVariableMemory.size;
      if (currentCount >= this.maxVariableCount) {
        throw new Error(
          `Variable limit exceeded: Cannot create variable "${variableName}". ` +
          `Maximum ${this.maxVariableCount} variables allowed (currently have ${currentCount}). ` +
          `Use FREE to remove unused variables or increase the limit with setMaxVariableCount().`
        );
      }
    }
    
    targetMap.set(variableName, value);
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

   // Flexible variable checker - treats non-existent identifiers as string literals
   private variableOrStringLiteral(value: string, line: number): Variable {
     if (this.procLock) {
       const procValue = this.procVariableMemory.get(value);
       if (procValue !== undefined) {
         return procValue;
       }
     }

     const globalValue = this.variableMemory.get(value);
     if (globalValue !== undefined) {
       return globalValue;
     }

     const numericValue = Number(value);
     if (!isNaN(numericValue)) {
       return {
         type: PanSparkType.Number,
         value: numericValue
       }
     }

     // If it's not a variable or number, treat it as a string literal
     return {
       type: PanSparkType.String,
       value: value
     }
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

   // Single-pass compilation with instruction pre-processing
  public compile(code: string): CompiledInstruction[] {
    let lines = code.split("\n");
    const instructions: CompiledInstruction[] = [];

    this.jumpPoints.clear();
    this.procPoints.clear();

      // Track FOR/ENDFOR and TRY/CATCH depth incrementally during compilation
      let forDepth = 0;
      let tryDepth = 0;
      let structDepth = 0;
      let structDef: StructDefinition | null = null;

      // Pass 1: Tokenize and create instructions
      for (let counter = 0; counter < lines.length; counter++) {
        let line = lines[counter].trim();
        
        // Strip inline comments (// anywhere in the line)
        const commentIndex = line.indexOf("//");
        if (commentIndex !== -1) {
          line = line.substring(0, commentIndex).trim();
        }
        
        if (line === "") {
          continue;
        }
        
        TOKEN_REGEX.lastIndex = 0; // Reset regex state
        let tokens = [];
        let match;
        
        while ((match = TOKEN_REGEX.exec(line)) !== null) {
          if (match[1] !== undefined) {
            // Process escape sequences in strings
            tokens.push(processEscapeSequences(match[1]));
          } else if (match[2] !== undefined) {
            // Bracket content (list syntax)
            tokens.push(`${match[2]}`);
          } else if (match[3] !== undefined) {
            // >> operator
            tokens.push(">>", match[3]);
          } else if (match[4] !== undefined) {
            // Parenthesis content - for CALL syntax, just extract the content
            tokens.push(match[4]);
          } else if (match[5] !== undefined) {
            // General token (includes bare parentheses)
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

        // Handle STRUCT and STRUCTEND for compilation
        if (operation === OpCode.STRUCT) {
          structDepth++;
          const structName = tokens[1];
          structDef = {
            name: structName,
            fields: new Map(),
          };
          continue; // Skip adding STRUCT to instructions
        } else if (operation === OpCode.STRUCTEND) {
          structDepth--;
          if (structDef) {
            this.structDefinitions.set(structDef.name, structDef);
            structDef = null;
          }
          continue; // Skip adding STRUCTEND to instructions
        }

        // Handle struct field definitions (within STRUCT/STRUCTEND)
        if (structDepth > 0 && operation !== OpCode.STRUCT && operation !== OpCode.STRUCTEND) {
          // This is a field definition: fieldName: type (tokenizer produces [fieldName:, type])
          if (tokens.length >= 2 && tokens[0].endsWith(':')) {
            const fieldName = tokens[0].slice(0, -1); // Remove trailing ':'
            const fieldType = tokens[1] as 'number' | 'string' | 'list';
            if (!structDef) {
              throw new Error(`Field definition outside STRUCT block at line ${counter + 1}`);
            }
            if (!['number', 'string', 'list'].includes(fieldType)) {
              throw new Error(`Invalid field type "${fieldType}" at line ${counter + 1}`);
            }
            structDef.fields.set(fieldName, { type: fieldType });
            continue; // Skip adding this as an instruction
          }
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
       
        // Track FOR/ENDFOR depth incrementally (O(1) instead of O(n²))
        if (operation === OpCode.FOR) {
          forDepth++;
        } else if (operation === OpCode.ENDFOR) {
          forDepth--;
          if (forDepth < 0) {
            throw new Error(`Unexpected ENDFOR at line ${counter + 1} without matching FOR`);
          }
        }
        
        // Track TRY/CATCH/ENDTRY depth
        if (operation === OpCode.TRY) {
          tryDepth++;
        } else if (operation === OpCode.ENDTRY) {
          tryDepth--;
          if (tryDepth < 0) {
            throw new Error(`Unexpected ENDTRY at line ${counter + 1} without matching TRY`);
          }
        }

        // Track STRUCT/STRUCTEND depth
        if (operation === OpCode.STRUCT) {
          structDepth++;
        } else if (operation === OpCode.STRUCTEND) {
          structDepth--;
          if (structDepth < 0) {
            throw new Error(`Unexpected STRUCTEND at line ${counter + 1} without matching STRUCT`);
          }
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
     let tryBlockStack: Array<{ startLine: number; catchIndex: number | null; errorVar: string | null }> = [];
     
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
       
       if (instruction.operation === OpCode.ENDPROC  ) {
         if (!procOpen) {
           throw new Error(`Unexpected '}' at line ${instruction.line} without matching PROC`);
         }
         procPoint.endLine = counter;
         this.procPoints.set(procPoint.name, [procPoint.startLine, procPoint.endLine]);
         procOpen = false;
       }
       
       // Track TRY blocks for compilation
       if (instruction.operation === OpCode.TRY) {
         tryBlockStack.push({
           startLine: counter,
           catchIndex: null,
           errorVar: instruction.args[0] || null
         });
       } else if (instruction.operation === OpCode.CATCH) {
         if (tryBlockStack.length === 0) {
           throw new Error(`Unexpected CATCH at line ${instruction.line} without matching TRY`);
         }
         tryBlockStack[tryBlockStack.length - 1].catchIndex = counter;
       } else if (instruction.operation === OpCode.ENDTRY) {
         if (tryBlockStack.length === 0) {
           throw new Error(`Unexpected ENDTRY at line ${instruction.line} without matching TRY`);
         }
         tryBlockStack.pop();
       }
     }

     if (procOpen) {
       throw new Error(`Unclosed PROC "${procPoint.name}" starting at line ${procPoint.startLine + 1}`);
     }
     
     if (tryBlockStack.length > 0) {
       throw new Error(`Unclosed TRY block starting at line ${tryBlockStack[0].startLine + 1}`);
     }

     // Pass 3: Pre-resolve jump targets and validate they exist
     for (let i = 0; i < instructions.length; i++) {
       const instruction = instructions[i];
       
       if (instruction.operation === OpCode.JUMP && instruction.args.length > 0) {
         const target = this.jumpPoints.get(instruction.args[0]);
         if (target === undefined) {
           throw new Error(
             `Jump target "${instruction.args[0]}" not found at line ${instruction.line}. ` +
             `Valid targets are: ${Array.from(this.jumpPoints.keys()).join(', ') || '(none defined)'}`
           );
         }
         instruction.jumpTarget = target;
         } else if (instruction.operation === OpCode.IF) {
           // Find the jump target (last argument after >>)
           let jumpTargetStr = '';
           const arrowToken = '>>'; 
           const arrowIndex = instruction.args.indexOf(arrowToken);
           if (arrowIndex !== -1 && arrowIndex < instruction.args.length - 1) {
             jumpTargetStr = instruction.args[instruction.args.length - 1];
           } else if (instruction.args.length >= 5 && !['AND', 'OR'].includes(instruction.args[3])) {
             // Legacy: standard if without >>
             jumpTargetStr = instruction.args[4];
           } else if (instruction.args.length >= 9) {
             // AND/OR case where target might be at position 7 or later
             jumpTargetStr = instruction.args[instruction.args.length - 1];
           }
           
           if (jumpTargetStr) {
             const target = this.jumpPoints.get(jumpTargetStr);
             if (target === undefined) {
               throw new Error(
                 `Jump target "${jumpTargetStr}" not found at line ${instruction.line}. ` +
                 `Valid targets are: ${Array.from(this.jumpPoints.keys()).join(', ') || '(none defined)'}`
               );
             }
             instruction.jumpTarget = target;
           }
          
          if (jumpTargetStr) {
            const target = this.jumpPoints.get(jumpTargetStr);
            if (target === undefined) {
              throw new Error(
                `Jump target "${jumpTargetStr}" not found at line ${instruction.line}. ` +
                `Valid targets are: ${Array.from(this.jumpPoints.keys()).join(', ') || '(none defined)'}`
              );
            }
            instruction.jumpTarget = target;
          }
       } else if (instruction.operation === OpCode.FOR) {
         // Pre-compute matching ENDFOR index for optimization
         let endForIndex = -1;
         let depth = 0;
         for (let j = i + 1; j < instructions.length; j++) {
           if (instructions[j].operation === OpCode.FOR) depth++;
           if (instructions[j].operation === OpCode.ENDFOR) {
             if (depth === 0) {
               endForIndex = j;
               break;
             }
             depth--;
           }
         }
         if (endForIndex === -1) {
           throw new Error(`FOR loop at line ${instruction.line} has no matching ENDFOR`);
         }
         instruction.endForIndex = endForIndex;
       }
     }

     return instructions;
  }

  // Inline math operations for common operators
  private executeMath(a: number, b: number, op: string): number {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': {
        // Prevent division by zero
        if (b === 0) {
          throw new Error(`Division by zero error: cannot divide ${a} by 0`);
        }
        return a / b;
      }
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

  // Predictive execution - batch instructions without WAIT
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
      
      // Debug tracing
      if (this.debugMode) {
        const opName = typeof instruction.operation === 'string' 
          ? instruction.operation 
          : OpCode[instruction.operation];
        const argsStr = instruction.args.length > 0 
          ? ` [${instruction.args.slice(0, 3).join(", ")}${instruction.args.length > 3 ? ", ..." : ""}]`
          : "";
        this.buffer.push(`[DEBUG] Line ${instruction.line}: ${opName}${argsStr} (tick: ${this.counter})`);
      }
      
      if (this.shouldReturn && this.procLock) {
        const boundaries = this.getCurrentProcBoundaries();
        if (boundaries) {
          this.counter = boundaries[1];
          this.shouldReturn = false;
          continue;
        }
      }
      
      // Use cached custom handler
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
         try {
         switch (instruction.operation) {
            case OpCode.SET: {
              if (instruction.args.length === 1) {
                if (isNaN(Number(instruction.args[0]))) {
                  this.setVariableMemory(instruction.args[0], Num(0));
                } else {
                  throw new Error(`Invalid variable name '${instruction.args[0]}' at line ${instruction.line}`);
                }
              } else {
                // Check if the first argument is a string literal
                const firstArg = instruction.args[0];
                let value: Variable;
                
                // Empty strings should always be treated as string literals
                if (firstArg === '') {
                  value = Str('');
                } else if (!isNaN(Number(firstArg))) {
                  // It's a numeric literal
                  value = Num(Number(firstArg));
                } else if (this.structDefinitions.has(firstArg)) {
                  // It's a struct type name - create instance
                  const instance = this.createStructInstance(firstArg);
                  value = Struct(instance);
                } else {
                  // It's either a string or a variable name
                  // Check if it's defined as a variable first
                  try {
                    value = this.variableCheck(firstArg, instruction.line);
                  } catch {
                    // If not a variable, treat it as a string literal
                    value = Str(firstArg);
                  }
                }
                this.setVariableMemory(instruction.args[2], value);
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
            
            // Add bounds checking to prevent out-of-bounds writes
            if (index.value < 0 || index.value >= list.value.length) {
              throw new Error(
                `List index ${index.value} out of bounds at line ${instruction.line}. ` +
                `List has ${list.value.length} elements (valid indices: 0-${list.value.length - 1})`
              );
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
            case OpCode.LIST_LENGTH: {
              // LIST_LENGTH list >> result
              const arrowIndex = instruction.args.indexOf(">>");
              if (arrowIndex === -1 || arrowIndex === 0 || arrowIndex === instruction.args.length - 1) {
                throw new Error(`Invalid LIST_LENGTH syntax at line ${instruction.line}. Expected: LIST_LENGTH list >> result`);
              }
              
              const list = this.variableCheck(instruction.args[0], instruction.line);
              const destVar = instruction.args[arrowIndex + 1];
              
              if (list.type !== PanSparkType.List) {
                throw new Error(`The provided variable is not a list at line ${instruction.line}`);
              }
              
              this.setVariableMemory(destVar, Num(list.value.length));
              break;
            }
            case OpCode.LIST_REVERSE: {
              // LIST_REVERSE list >> result
              const arrowIndex = instruction.args.indexOf(">>");
              if (arrowIndex === -1 || arrowIndex === 0 || arrowIndex === instruction.args.length - 1) {
                throw new Error(`Invalid LIST_REVERSE syntax at line ${instruction.line}. Expected: LIST_REVERSE list >> result`);
              }
              
              const list = this.variableCheck(instruction.args[0], instruction.line);
              const destVar = instruction.args[arrowIndex + 1];
              
              if (list.type !== PanSparkType.List) {
                throw new Error(`The provided variable is not a list at line ${instruction.line}`);
              }
              
              const reversed = [...list.value].reverse();
              this.setVariableMemory(destVar, List(reversed));
              break;
            }
            case OpCode.LIST_FIND: {
              // LIST_FIND list value >> result (returns index or -1)
              const arrowIndex = instruction.args.indexOf(">>");
              if (arrowIndex === -1 || arrowIndex < 2 || arrowIndex === instruction.args.length - 1) {
                throw new Error(`Invalid LIST_FIND syntax at line ${instruction.line}. Expected: LIST_FIND list value >> result`);
              }
              
              const list = this.variableCheck(instruction.args[0], instruction.line);
              const value = this.variableCheck(instruction.args[1], instruction.line);
              const destVar = instruction.args[arrowIndex + 1];
              
              if (list.type !== PanSparkType.List) {
                throw new Error(`The provided variable is not a list at line ${instruction.line}`);
              }
              if (value.type !== PanSparkType.Number) {
                throw new Error(`The search value must be a number at line ${instruction.line}`);
              }
              
              const index = list.value.indexOf(value.value);
              this.setVariableMemory(destVar, Num(index));
              break;
            }
            case OpCode.LIST_INDEX_OF: {
              // LIST_INDEX_OF list value >> result (alias for LIST_FIND)
              const arrowIndex = instruction.args.indexOf(">>");
              if (arrowIndex === -1 || arrowIndex < 2 || arrowIndex === instruction.args.length - 1) {
                throw new Error(`Invalid LIST_INDEX_OF syntax at line ${instruction.line}. Expected: LIST_INDEX_OF list value >> result`);
              }
              
              const list = this.variableCheck(instruction.args[0], instruction.line);
              const value = this.variableCheck(instruction.args[1], instruction.line);
              const destVar = instruction.args[arrowIndex + 1];
              
              if (list.type !== PanSparkType.List) {
                throw new Error(`The provided variable is not a list at line ${instruction.line}`);
              }
              if (value.type !== PanSparkType.Number) {
                throw new Error(`The search value must be a number at line ${instruction.line}`);
              }
              
              const index = list.value.indexOf(value.value);
              this.setVariableMemory(destVar, Num(index));
              break;
            }
            case OpCode.LIST_CONTAINS: {
              // LIST_CONTAINS list value >> result (returns 1 or 0)
              const arrowIndex = instruction.args.indexOf(">>");
              if (arrowIndex === -1 || arrowIndex < 2 || arrowIndex === instruction.args.length - 1) {
                throw new Error(`Invalid LIST_CONTAINS syntax at line ${instruction.line}. Expected: LIST_CONTAINS list value >> result`);
              }
              
              const list = this.variableCheck(instruction.args[0], instruction.line);
              const value = this.variableCheck(instruction.args[1], instruction.line);
              const destVar = instruction.args[arrowIndex + 1];
              
              if (list.type !== PanSparkType.List) {
                throw new Error(`The provided variable is not a list at line ${instruction.line}`);
              }
              if (value.type !== PanSparkType.Number) {
                throw new Error(`The search value must be a number at line ${instruction.line}`);
              }
              
              const found = list.value.includes(value.value) ? 1 : 0;
              this.setVariableMemory(destVar, Num(found));
              break;
            }
            case OpCode.LIST_REMOVE: {
              // LIST_REMOVE list index >> result
              const arrowIndex = instruction.args.indexOf(">>");
              if (arrowIndex === -1 || arrowIndex < 2 || arrowIndex === instruction.args.length - 1) {
                throw new Error(`Invalid LIST_REMOVE syntax at line ${instruction.line}. Expected: LIST_REMOVE list index >> result`);
              }
              
              const list = this.variableCheck(instruction.args[0], instruction.line);
              const index = this.variableCheck(instruction.args[1], instruction.line);
              const destVar = instruction.args[arrowIndex + 1];
              
              if (list.type !== PanSparkType.List) {
                throw new Error(`The provided variable is not a list at line ${instruction.line}`);
              }
              if (index.type !== PanSparkType.Number) {
                throw new Error(`The index must be a number at line ${instruction.line}`);
              }
              
              if (index.value < 0 || index.value >= list.value.length) {
                throw new Error(`Index ${index.value} out of bounds at line ${instruction.line}`);
              }
              
              const removed = list.value.splice(index.value, 1)[0];
              this.setVariableMemory(destVar, Num(removed));
              break;
            }
           case OpCode.CONCAT: {
             // CONCAT string1 string2 >> result
             const arrowIndex = instruction.args.indexOf(">>");
             if (arrowIndex === -1 || arrowIndex < 2 || arrowIndex === instruction.args.length - 1) {
               throw new Error(`Invalid CONCAT syntax at line ${instruction.line}. Expected: CONCAT string1 string2 >> result`);
             }
             
             const str1 = this.variableCheck(instruction.args[0], instruction.line);
             const str2 = this.variableCheck(instruction.args[1], instruction.line);
             const destVar = instruction.args[arrowIndex + 1];
             
             // Convert both to strings
             let str1Val = '';
             let str2Val = '';
             
             if (str1.type === PanSparkType.String) {
               str1Val = str1.value;
             } else if (str1.type === PanSparkType.Number) {
               str1Val = str1.value.toString();
             } else {
               throw new Error(`Cannot concatenate list at line ${instruction.line}`);
             }
             
             if (str2.type === PanSparkType.String) {
               str2Val = str2.value;
             } else if (str2.type === PanSparkType.Number) {
               str2Val = str2.value.toString();
             } else {
               throw new Error(`Cannot concatenate list at line ${instruction.line}`);
             }
             
             const result = str1Val + str2Val;
             this.setVariableMemory(destVar, Str(result));
             break;
           }
           case OpCode.STRLEN: {
             // STRLEN string >> result
             const arrowIndex = instruction.args.indexOf(">>");
             if (arrowIndex === -1 || arrowIndex === 0 || arrowIndex === instruction.args.length - 1) {
               throw new Error(`Invalid STRLEN syntax at line ${instruction.line}. Expected: STRLEN string >> result`);
             }
             
             const str = this.variableCheck(instruction.args[0], instruction.line);
             const destVar = instruction.args[arrowIndex + 1];
             let len = 0;
             
             if (str.type === PanSparkType.String) {
               len = str.value.length;
             } else if (str.type === PanSparkType.Number) {
               len = str.value.toString().length;
             } else {
               throw new Error(`Cannot get length of list at line ${instruction.line}`);
             }
             
             this.setVariableMemory(destVar, Num(len));
             break;
           }
            case OpCode.SUBSTR: {
              // SUBSTR string start end >> result
              const arrowIndex = instruction.args.indexOf(">>");
              if (arrowIndex === -1 || arrowIndex < 3 || arrowIndex === instruction.args.length - 1) {
                throw new Error(`Invalid SUBSTR syntax at line ${instruction.line}. Expected: SUBSTR string start end >> result`);
              }
              
              const str = this.variableCheck(instruction.args[0], instruction.line);
              const start = this.variableCheck(instruction.args[1], instruction.line);
              const end = this.variableCheck(instruction.args[2], instruction.line);
              const destVar = instruction.args[arrowIndex + 1];
              
              if (start.type !== PanSparkType.Number || end.type !== PanSparkType.Number) {
                throw new Error(`SUBSTR indices must be numbers at line ${instruction.line}`);
              }
              
              let strVal = '';
              if (str.type === PanSparkType.String) {
                strVal = str.value;
              } else if (str.type === PanSparkType.Number) {
                strVal = str.value.toString();
              } else {
                throw new Error(`Cannot substring a list at line ${instruction.line}`);
              }
              
              const result = strVal.substring(start.value, end.value);
              this.setVariableMemory(destVar, Str(result));
              break;
            }
            case OpCode.STR_UPPER: {
              // STR_UPPER string >> result
              const arrowIndex = instruction.args.indexOf(">>");
              if (arrowIndex === -1 || arrowIndex === 0 || arrowIndex === instruction.args.length - 1) {
                throw new Error(`Invalid STR_UPPER syntax at line ${instruction.line}. Expected: STR_UPPER string >> result`);
              }
              
              const str = this.variableCheck(instruction.args[0], instruction.line);
              const destVar = instruction.args[arrowIndex + 1];
              
              let strVal = '';
              if (str.type === PanSparkType.String) {
                strVal = str.value;
              } else if (str.type === PanSparkType.Number) {
                strVal = str.value.toString();
              } else {
                throw new Error(`Cannot uppercase a list at line ${instruction.line}`);
              }
              
              this.setVariableMemory(destVar, Str(strVal.toUpperCase()));
              break;
            }
            case OpCode.STR_LOWER: {
              // STR_LOWER string >> result
              const arrowIndex = instruction.args.indexOf(">>");
              if (arrowIndex === -1 || arrowIndex === 0 || arrowIndex === instruction.args.length - 1) {
                throw new Error(`Invalid STR_LOWER syntax at line ${instruction.line}. Expected: STR_LOWER string >> result`);
              }
              
              const str = this.variableCheck(instruction.args[0], instruction.line);
              const destVar = instruction.args[arrowIndex + 1];
              
              let strVal = '';
              if (str.type === PanSparkType.String) {
                strVal = str.value;
              } else if (str.type === PanSparkType.Number) {
                strVal = str.value.toString();
              } else {
                throw new Error(`Cannot lowercase a list at line ${instruction.line}`);
              }
              
              this.setVariableMemory(destVar, Str(strVal.toLowerCase()));
              break;
            }
            case OpCode.STR_TRIM: {
              // STR_TRIM string >> result
              const arrowIndex = instruction.args.indexOf(">>");
              if (arrowIndex === -1 || arrowIndex === 0 || arrowIndex === instruction.args.length - 1) {
                throw new Error(`Invalid STR_TRIM syntax at line ${instruction.line}. Expected: STR_TRIM string >> result`);
              }
              
              const str = this.variableCheck(instruction.args[0], instruction.line);
              const destVar = instruction.args[arrowIndex + 1];
              
              let strVal = '';
              if (str.type === PanSparkType.String) {
                strVal = str.value;
              } else if (str.type === PanSparkType.Number) {
                strVal = str.value.toString();
              } else {
                throw new Error(`Cannot trim a list at line ${instruction.line}`);
              }
              
              this.setVariableMemory(destVar, Str(strVal.trim()));
              break;
            }
            case OpCode.STR_REPLACE: {
              // STR_REPLACE string find replace >> result
              const arrowIndex = instruction.args.indexOf(">>");
              if (arrowIndex === -1 || arrowIndex < 3 || arrowIndex === instruction.args.length - 1) {
                throw new Error(`Invalid STR_REPLACE syntax at line ${instruction.line}. Expected: STR_REPLACE string find replace >> result`);
              }
              
              const str = this.variableOrStringLiteral(instruction.args[0], instruction.line);
              const find = this.variableOrStringLiteral(instruction.args[1], instruction.line);
              const replace = this.variableOrStringLiteral(instruction.args[2], instruction.line);
              const destVar = instruction.args[arrowIndex + 1];
              
              let strVal = '';
              if (str.type === PanSparkType.String) {
                strVal = str.value;
              } else if (str.type === PanSparkType.Number) {
                strVal = str.value.toString();
              } else {
                throw new Error(`Cannot replace in a list at line ${instruction.line}`);
              }
              
              let findVal = '';
              if (find.type === PanSparkType.String) {
                findVal = find.value;
              } else if (find.type === PanSparkType.Number) {
                findVal = find.value.toString();
              } else {
                throw new Error(`Find pattern cannot be a list at line ${instruction.line}`);
              }
              
              let replaceVal = '';
              if (replace.type === PanSparkType.String) {
                replaceVal = replace.value;
              } else if (replace.type === PanSparkType.Number) {
                replaceVal = replace.value.toString();
              } else {
                throw new Error(`Replace value cannot be a list at line ${instruction.line}`);
              }
              
              const result = strVal.replace(new RegExp(findVal, 'g'), replaceVal);
              this.setVariableMemory(destVar, Str(result));
              break;
            }
            case OpCode.STR_CONTAINS: {
              // STR_CONTAINS string substring >> result (returns 1 or 0)
              const arrowIndex = instruction.args.indexOf(">>");
              if (arrowIndex === -1 || arrowIndex < 2 || arrowIndex === instruction.args.length - 1) {
                throw new Error(`Invalid STR_CONTAINS syntax at line ${instruction.line}. Expected: STR_CONTAINS string substring >> result`);
              }
              
              const str = this.variableOrStringLiteral(instruction.args[0], instruction.line);
              const search = this.variableOrStringLiteral(instruction.args[1], instruction.line);
              const destVar = instruction.args[arrowIndex + 1];
              
              let strVal = '';
              if (str.type === PanSparkType.String) {
                strVal = str.value;
              } else if (str.type === PanSparkType.Number) {
                strVal = str.value.toString();
              } else {
                throw new Error(`Cannot search in a list at line ${instruction.line}`);
              }
              
              let searchVal = '';
              if (search.type === PanSparkType.String) {
                searchVal = search.value;
              } else if (search.type === PanSparkType.Number) {
                searchVal = search.value.toString();
              } else {
                throw new Error(`Search pattern cannot be a list at line ${instruction.line}`);
              }
              
              const result = strVal.includes(searchVal) ? 1 : 0;
              this.setVariableMemory(destVar, Num(result));
              break;
            }
            case OpCode.STR_CHAR: {
              // STR_CHAR string index >> result
              const arrowIndex = instruction.args.indexOf(">>");
              if (arrowIndex === -1 || arrowIndex < 2 || arrowIndex === instruction.args.length - 1) {
                throw new Error(`Invalid STR_CHAR syntax at line ${instruction.line}. Expected: STR_CHAR string index >> result`);
              }
              
              const str = this.variableCheck(instruction.args[0], instruction.line);
              const index = this.variableCheck(instruction.args[1], instruction.line);
              const destVar = instruction.args[arrowIndex + 1];
              
              if (index.type !== PanSparkType.Number) {
                throw new Error(`STR_CHAR index must be a number at line ${instruction.line}`);
              }
              
              let strVal = '';
              if (str.type === PanSparkType.String) {
                strVal = str.value;
              } else if (str.type === PanSparkType.Number) {
                strVal = str.value.toString();
              } else {
                throw new Error(`Cannot get character from a list at line ${instruction.line}`);
              }
              
              const char = strVal.charAt(index.value);
              this.setVariableMemory(destVar, Str(char));
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
           case OpCode.MEMSTATS: {
             // Calculate memory statistics
             const globalVarCount = this.variableMemory.size;
             const localVarCount = this.procLock ? this.procVariableMemory.size : 0;
             
             // Calculate memory size estimate (rough approximation)
             let globalMemSize = 0;
             for (const [key, value] of this.variableMemory.entries()) {
               globalMemSize += key.length; // variable name
               if (value.type === PanSparkType.Number) {
                 globalMemSize += 8; // number size
               } else if (value.type === PanSparkType.String) {
                 globalMemSize += value.value.length;
               } else if (value.type === PanSparkType.List) {
                 globalMemSize += value.value.length * 8;
               }
             }
             
             let localMemSize = 0;
             if (this.procLock) {
               for (const [key, value] of this.procVariableMemory.entries()) {
                 localMemSize += key.length;
                 if (value.type === PanSparkType.Number) {
                   localMemSize += 8;
                 } else if (value.type === PanSparkType.String) {
                   localMemSize += value.value.length;
                 } else if (value.type === PanSparkType.List) {
                   localMemSize += value.value.length * 8;
                 }
               }
             }
             
             const procDepth = this.procLock ? this.procStack.length : 0;
             
             // Check for >> operator to determine if storing to variable
             const arrowIndex = instruction.args.indexOf(">>");
             let targetVar = null;
             if (arrowIndex !== -1 && arrowIndex < instruction.args.length - 1) {
               targetVar = instruction.args[arrowIndex + 1];
             }
             
             if (targetVar) {
               // If target variable specified, store stats as a string
               const stats = `STATS:GlobalVars=${globalVarCount},LocalVars=${localVarCount},GlobalMem=${globalMemSize}B,LocalMem=${localMemSize}B,ProcDepth=${procDepth}`;
               this.setVariableMemory(targetVar, Str(stats));
             } else {
               // Otherwise, print to buffer
               this.buffer.push(`=== MEMORY STATISTICS ===`);
               this.buffer.push(`Global Variables: ${globalVarCount}`);
               this.buffer.push(`Local Variables: ${localVarCount}`);
               this.buffer.push(`Global Memory: ~${globalMemSize} bytes`);
               this.buffer.push(`Local Memory: ~${localMemSize} bytes`);
               this.buffer.push(`Procedure Depth: ${procDepth}`);
               if (this.maxVariableCount > 0) {
                 const remainingVars = this.maxVariableCount - globalVarCount - localVarCount;
                 this.buffer.push(`Variable Limit: ${this.maxVariableCount} (${remainingVars} remaining)`);
               }
               this.buffer.push(`Total Ticks: ${this.counter}`);
             }
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
            // PRINT can handle both string literals (already processed by tokenizer) and variables
            const arg = instruction.args[0];
            
            // Try to treat it as a variable first
            try {
              const printVar = this.variableCheck(arg, instruction.line);
              if (printVar.type === PanSparkType.Number) {
                this.buffer.push(printVar.value.toString());
              } else if (printVar.type === PanSparkType.String) {
                this.buffer.push(printVar.value);
              } else if (printVar.type === PanSparkType.List) {
                this.buffer.push("[" + printVar.value.toString()+"]");
              }
            } catch (e) {
              // If it's not a variable, check if it's a number literal
              const num = parseFloat(arg.toString());
              if (!isNaN(num)) {
                this.buffer.push(num.toString());
              } else {
                // Otherwise, treat it as a string literal (already processed by tokenizer)
                this.buffer.push(arg.toString());
              }
            }
            break;
          }
           case OpCode.TYPEOF: {
             // TYPEOF variable >> result
             const arrowIndex = instruction.args.indexOf(">>");
             if (arrowIndex === -1 || arrowIndex === 0 || arrowIndex === instruction.args.length - 1) {
               throw new Error(`Invalid TYPEOF syntax at line ${instruction.line}. Expected: TYPEOF variable >> result`);
             }
             
             const varName = instruction.args[0];
             const destVar = instruction.args[arrowIndex + 1];
             
             try {
               const variable = this.variableCheck(varName, instruction.line);
               let typeString = '';
               
               switch (variable.type) {
                 case PanSparkType.Number:
                   typeString = 'number';
                   break;
                 case PanSparkType.String:
                   typeString = 'string';
                   break;
                 case PanSparkType.List:
                   typeString = 'list';
                   break;
               }
               
               this.setVariableMemory(destVar, Str(typeString));
             } catch (err) {
               // Variable doesn't exist, return 'undefined'
               this.setVariableMemory(destVar, Str('undefined'));
             }
             break;
           }
          case OpCode.MATH: {
            const instructionArgs = instruction.args;
            const line = instruction.line;
            
            // Find the >> operator
            const arrowIndex = instructionArgs.indexOf(">>");
            if (arrowIndex === -1 || arrowIndex === instructionArgs.length - 1) {
              throw new Error(`Invalid MATH syntax at line ${line}. Expected: MATH expression >> result`);
            }
            
            const destVariable = instructionArgs[arrowIndex + 1];
            const expressionArgs = instructionArgs.slice(0, arrowIndex);
            
            // Check if it's a unary function (sqrt, sin, cos, etc.)
            if (expressionArgs.length === 2) {
              const op = expressionArgs[1];
              if (this.unaryMathOps.has(op)) {
                const arg = this.variableCheck(expressionArgs[0], line);
                if (arg.type !== PanSparkType.Number) {
                  throw new Error(`The provided variable is not a number at line ${line}`);
                }
                const result = this.executeUnaryMath(arg.value, op);
                this.setVariableMemory(destVariable, Num(result));
                break;
              }
            }
            
             // Check if it's a simple binary operation (legacy support)
             if (expressionArgs.length === 3) {
               const op = expressionArgs[1];
               if (['+', '-', '*', '/', '%', '**', 'min', 'max'].includes(op)) {
                 // Make sure this isn't a more complex expression (e.g., unary minus)
                 // by trying to check if the first arg looks like a valid variable/number
                 const firstArg = expressionArgs[0];
                 // If it contains spaces, parentheses, or starts with an operator, it's likely not a simple binary
                 if (!firstArg.includes(' ') && !firstArg.includes('(') && !firstArg.includes(')') && !firstArg.startsWith('-') && !firstArg.startsWith('+')) {
                   const arg1 = this.variableCheck(firstArg, line);
                   const arg2 = this.variableCheck(expressionArgs[2], line);
                   
                   if (arg1.type !== PanSparkType.Number || arg2.type !== PanSparkType.Number) {
                     throw new Error(`The provided variables are not numbers at line ${line}`);
                   }
                   
                   const result = this.executeMath(arg1.value, arg2.value, op);
                   this.setVariableMemory(destVariable, Num(result));
                   break;
                 }
               }
             }
            
            // Multi-term expression - combine all args into a single expression string
            // For expressions like "(2 + 3) * (4 + 5)", args become ["2 + 3", "*", "4 + 5"]
            // We need to wrap args that contain operators back in parentheses
            const expression = expressionArgs
              .map((arg) => {
                if (typeof arg === 'string') {
                  // Skip operators, ** and min/max
                  if (['+', '-', '*', '/', '%', '**', 'min', 'max'].includes(arg)) {
                    return arg;
                  }
                  // Skip if it's just a number or variable name
                  if (!isNaN(Number(arg)) || arg.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
                    return arg;
                  }
                  // Skip if already wrapped
                  if (arg.startsWith('(') && arg.endsWith(')')) {
                    return arg;
                  }
                  // Skip if it starts with unary operator and has parentheses (like "-(2" from tokenizer)
                  if ((arg.startsWith('-') || arg.startsWith('+')) && arg.includes('(')) {
                    return arg;
                  }
                  // It's a complex expression - wrap it
                  if (arg.includes(' ') || arg.match(/[+\-*/%]/)) {
                    return `(${arg})`;
                  }
                }
                return arg;
              })
              .join(' ');
            const result = this.evaluateExpression(expression, line);
            
            if (Number.isNaN(result)) {
              throw new Error(`Math operation resulted in NaN at line ${line}`);
            }
            
            this.setVariableMemory(destVariable, Num(result));
            break;
          }
           case OpCode.IF: {
             const instructionArgs = instruction.args;
             let check = false;
             
             // Handle single comparison: IF value1 op value2 >> label
             if (instructionArgs.length >= 5 && 
                 !['AND', 'OR', 'NOT'].includes(instructionArgs[1])) {
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
             } else if (instructionArgs[0] === 'NOT') {
               // Handle NOT operator: IF NOT condition >> label
               const notArg = instructionArgs[1];
               try {
                 const val = this.variableCheck(notArg, instruction.line);
                 if (val.type === PanSparkType.Number) {
                   check = val.value === 0;
                 } else {
                   throw new Error(`NOT requires a numeric value at line ${instruction.line}`);
                 }
               } catch {
                 check = true; // undefined variables are falsy
               }
             } else if (instructionArgs.length >= 7) {
               // Handle AND/OR operators: IF cond1 AND/OR cond2 >> label OR IF val1 op1 val2 AND/OR val3 op2 val4 >> label
               let leftCheck = false;
               let rightCheck = false;
               const operator = instructionArgs[3];
               
               if (operator === 'AND' || operator === 'OR') {
                 // First condition
                 const arg1 = this.variableCheck(instructionArgs[0], instruction.line);
                 const op1 = instructionArgs[1];
                 const arg2 = this.variableCheck(instructionArgs[2], instruction.line);
                 
                 if (arg1.type !== PanSparkType.Number || arg2.type !== PanSparkType.Number) {
                   throw new Error(`Comparison values must be numbers at line ${instruction.line}`);
                 }
                 
                 let val1 = arg1.value;
                 let val2 = arg2.value;
                 
                 switch (op1) {
                   case '>': leftCheck = val1 > val2; break;
                   case '<': leftCheck = val1 < val2; break;
                   case '==': leftCheck = val1 == val2; break;
                   case '!=': leftCheck = val1 != val2; break;
                   case '>=': leftCheck = val1 >= val2; break;
                   case '<=': leftCheck = val1 <= val2; break;
                   default:
                     throw new Error(`Invalid comparison operator "${op1}" at line ${instruction.line}`);
                 }
                 
                 // Second condition
                 const arg3 = this.variableCheck(instructionArgs[4], instruction.line);
                 const op2 = instructionArgs[5];
                 const arg4 = this.variableCheck(instructionArgs[6], instruction.line);
                 
                 if (arg3.type !== PanSparkType.Number || arg4.type !== PanSparkType.Number) {
                   throw new Error(`Comparison values must be numbers at line ${instruction.line}`);
                 }
                 
                 let val3 = arg3.value;
                 let val4 = arg4.value;
                 
                 switch (op2) {
                   case '>': rightCheck = val3 > val4; break;
                   case '<': rightCheck = val3 < val4; break;
                   case '==': rightCheck = val3 == val4; break;
                   case '!=': rightCheck = val3 != val4; break;
                   case '>=': rightCheck = val3 >= val4; break;
                   case '<=': rightCheck = val3 <= val4; break;
                   default:
                     throw new Error(`Invalid comparison operator "${op2}" at line ${instruction.line}`);
                 }
                 
                 if (operator === 'AND') {
                   check = leftCheck && rightCheck;
                 } else {
                   check = leftCheck || rightCheck;
                 }
               } else {
                 throw new Error(`Invalid IF syntax at line ${instruction.line}`);
               }
             } else {
               throw new Error(`Invalid IF syntax at line ${instruction.line}`);
             }
             
             if (check) {
               // Use pre-resolved jump target if available
               const lastArg = instructionArgs[instructionArgs.length - 1];
               if (instruction.jumpTarget !== undefined) {
                 this.counter = instruction.jumpTarget - 1;
               } else {
                 this.counter = this.safeJumpPointCheck(lastArg, instruction.line) - 1;
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
          case OpCode.ENDPROC: {
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
          case OpCode.FOR: {
            const instructionArgs = instruction.args;
            if (instructionArgs.length < 3) {
              throw new Error(`Invalid FOR syntax at line ${instruction.line}. Expected: FOR variable start end [step]`);
            }
            
            const varName = instructionArgs[0];
            const startValue = this.variableCheck(instructionArgs[1], instruction.line);
            const endValue = this.variableCheck(instructionArgs[2], instruction.line);
            
            // Optional step parameter (default is 1)
            let step = 1;
            if (instructionArgs.length >= 4) {
              const stepValue = this.variableCheck(instructionArgs[3], instruction.line);
              if (stepValue.type !== PanSparkType.Number) {
                throw new Error(`FOR loop step must be a number at line ${instruction.line}`);
              }
              step = stepValue.value;
              if (step === 0) {
                throw new Error(`FOR loop step cannot be zero at line ${instruction.line}`);
              }
            }
            
            if (startValue.type !== PanSparkType.Number || endValue.type !== PanSparkType.Number) {
              throw new Error(`FOR loop bounds must be numbers at line ${instruction.line}`);
            }
            
            // Validate that loop will eventually terminate
            if (step > 0 && endValue.value < startValue.value) {
              throw new Error(`Invalid FOR loop at line ${instruction.line}. With positive step, end value must be >= start value`);
            }
            if (step < 0 && endValue.value > startValue.value) {
              throw new Error(`Invalid FOR loop at line ${instruction.line}. With negative step, end value must be <= start value`);
            }
             
             // Use pre-computed ENDFOR index (optimization - no runtime lookup needed)
             const endForLine = instruction.endForIndex;
             if (endForLine === undefined) {
               throw new Error(`FOR loop at line ${instruction.line} has no matching ENDFOR (compilation error)`);
             }
             
             // Initialize the loop variable
             this.setVariableMemory(varName, Num(startValue.value));
             
             // Push loop info onto the stack
             this.forStack.push({
               varName: varName,
               endValue: endValue.value,
               forStartLine: this.counter,
               endForLine: endForLine,
               step: step
             });
            break;
          }
          case OpCode.ENDFOR: {
            if (this.forStack.length === 0) {
              throw new Error(`ENDFOR without matching FOR at line ${instruction.line}`);
            }
            
            const loopInfo = this.forStack[this.forStack.length - 1];
            const loopVar = this.variableCheck(loopInfo.varName, instruction.line);
            
            if (loopVar.type !== PanSparkType.Number) {
              throw new Error(`Loop variable must be a number at line ${instruction.line}`);
            }
            
            const nextValue = loopVar.value + loopInfo.step;
            
            // Check if we should continue looping
            const shouldContinue = loopInfo.step > 0 
              ? nextValue <= loopInfo.endValue
              : nextValue >= loopInfo.endValue;
            
            if (shouldContinue) {
              // Update the loop variable
              this.setVariableMemory(loopInfo.varName, Num(nextValue));
              // Jump back to the instruction after FOR
              this.counter = loopInfo.forStartLine;
            } else {
              // Loop is done, pop from stack
              this.forStack.pop();
            }
            break;
          }
          case OpCode.BREAK: {
            if (this.forStack.length === 0) {
              throw new Error(`BREAK can only be used inside a FOR loop at line ${instruction.line}`);
            }
            
            // Pop the current loop and jump to after ENDFOR
            const loopInfo = this.forStack.pop()!;
            this.counter = loopInfo.endForLine;
            break;
          }
          case OpCode.CONTINUE: {
            if (this.forStack.length === 0) {
              throw new Error(`CONTINUE can only be used inside a FOR loop at line ${instruction.line}`);
            }
            
            const loopInfo = this.forStack[this.forStack.length - 1];
            const loopVar = this.variableCheck(loopInfo.varName, instruction.line);
            
            if (loopVar.type !== PanSparkType.Number) {
              throw new Error(`Loop variable must be a number at line ${instruction.line}`);
            }
            
            const nextValue = loopVar.value + 1;
            
            // Check if we should continue looping
            if (nextValue <= loopInfo.endValue) {
              // Increment the loop variable and jump back
              this.setVariableMemory(loopInfo.varName, Num(nextValue));
              this.counter = loopInfo.forStartLine;
            } else {
              // Loop is exhausted, pop and jump to ENDFOR
              this.forStack.pop();
              this.counter = loopInfo.endForLine;
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
           case OpCode.TRY: {
             // TRY errorVar
             const errorVar = instruction.args[0] || "_error";
             
             // Find matching CATCH
             let catchLine = -1;
             let depth = 0;
             for (let i = this.counter + 1; i < instructions.length; i++) {
               if (instructions[i].operation === OpCode.TRY) depth++;
               if (instructions[i].operation === OpCode.CATCH && depth === 0) {
                 catchLine = i;
                 break;
               }
               if (instructions[i].operation === OpCode.ENDTRY && depth === 0) break;
               if (instructions[i].operation === OpCode.ENDTRY) depth--;
             }
             
             if (catchLine === -1) {
               throw new Error(`TRY without CATCH at line ${instruction.line}`);
             }
             
             // Find matching ENDTRY
             let endTryLine = -1;
             depth = 0;
             for (let i = this.counter + 1; i < instructions.length; i++) {
               if (instructions[i].operation === OpCode.TRY) depth++;
               if (instructions[i].operation === OpCode.ENDTRY && depth === 0) {
                 endTryLine = i;
                 break;
               }
               if (instructions[i].operation === OpCode.ENDTRY) depth--;
             }
             
             if (endTryLine === -1) {
               throw new Error(`TRY without ENDTRY at line ${instruction.line}`);
             }
             
              this.tryStack.push({
                startLine: this.counter,
                catchLine: catchLine,
                endLine: endTryLine,
                errorVariable: errorVar,
                errorOccurred: false
              });
             break;
           }
            case OpCode.CATCH: {
              // Check if we reached CATCH due to an error
              if (this.tryStack.length > 0 && !this.tryStack[this.tryStack.length - 1].errorOccurred) {
                // No error occurred, skip CATCH block and go to ENDTRY
                const tryBlock = this.tryStack[this.tryStack.length - 1];
                this.counter = tryBlock.endLine;
              }
              // If error occurred, just continue normally to execute CATCH block
              break;
            }
           case OpCode.ENDTRY: {
             // End of TRY block, pop from stack
             if (this.tryStack.length > 0) {
               this.tryStack.pop();
             }
             break;
           }
             case OpCode.THROW: {
               // THROW message
               const errorMsg = instruction.args[0] || "An error occurred";
               this.lastError = errorMsg;
               
               if (this.tryStack.length > 0) {
                 const tryBlock = this.tryStack[this.tryStack.length - 1];
                 // Set error variable and jump to CATCH
                 this.setVariableMemory(tryBlock.errorVariable, Str(errorMsg));
                 // Mark that an error occurred
                 tryBlock.errorOccurred = true;
                 this.counter = tryBlock.catchLine - 1;
               } else {
                 throw new Error(`THROW: ${errorMsg}`);
               }
               break;
             }

            case OpCode.STRUCT_GET: {
              // STRUCT_GET var.field >> result
              const varFieldStr = instruction.args[0];
              const [varName, fieldName] = varFieldStr.split('.');

              const varValue = this.variableCheck(varName, instruction.line);
              if (varValue.type !== PanSparkType.Struct) {
                throw new Error(`Variable "${varName}" is not a struct at line ${instruction.line}`);
              }

              const fieldValue = this.getStructField(varValue.value, fieldName);
              const destVar = instruction.args[2];
              this.setVariableMemory(destVar, fieldValue);
              break;
            }

            case OpCode.STRUCT_SET: {
              // STRUCT_SET var.field value
              const varFieldStr = instruction.args[0];
              const [varName, fieldName] = varFieldStr.split('.');
              const valueArg = instruction.args[1];

              const varValue = this.variableCheck(varName, instruction.line);
              if (varValue.type !== PanSparkType.Struct) {
                throw new Error(`Variable "${varName}" is not a struct at line ${instruction.line}`);
              }

              // Try to get as variable first, fall back to string literal
              let value: Variable;
              try {
                value = this.variableCheck(valueArg, instruction.line);
              } catch {
                // Not a variable, treat as string literal
                value = Str(valueArg);
              }

              this.setStructField(varValue.value, fieldName, value);
              break;
            }

            default:
              throw new Error(`Unknown operation ${instruction.operation} at line ${instruction.line}`);
         }
          } catch (err) {
            // If an error occurs during execution and we're in a TRY block, catch it
            if (this.tryStack.length > 0) {
              const tryBlock = this.tryStack[this.tryStack.length - 1];
              const errorMessage = err instanceof Error ? err.message : String(err);
              
              // Store the error message to buffer
              this.buffer.push(errorMessage);
              this.setVariableMemory(tryBlock.errorVariable, Str(errorMessage));
              
              // Mark that an error occurred
              tryBlock.errorOccurred = true;
              
              // Jump to CATCH block
              this.counter = tryBlock.catchLine - 1;
            } else {
              // No TRY block, re-throw the error
              throw err;
            }
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
      this.forStack = [];
      this.procStack = [];
      this.forStack = [];
      this.framePool.clear();
      this.procReturn = Num(0);
      this.shouldReturn = false;
      this.waitTicks = 0;
      this.counter = 0;
      this.importedModules.clear();
      this.tryStack = [];
      this.lastError = "";
      this.structDefinitions.clear();
      this.inStructDef = false;
      this.currentStructDef = null;
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

   /**
    * Saves the entire VM execution state to a serialized string
    * Includes variables, jump points, procedures, execution position, and all runtime state
    * 
    * @param includeInstructions - If true, also saves the compiled instructions (required for resuming)
    * @returns Serialized state string (respects 32767 character limit per chunk)
    * @throws Error if state exceeds maximum chunk size
    */
    public saveState(instructions?: CompiledInstruction[]): string {
      const state = {
        uuid: this.uuid,
        counter: this.counter,
        waitTicks: this.waitTicks,
        variableMemory: this.serializeVariableMap(this.variableMemory),
        jumpPoints: Array.from(this.jumpPoints.entries()),
        procPoints: Array.from(this.procPoints.entries()),
        procStack: this.procStack.map(frame => ({
          variableMemory: this.serializeVariableMap(frame.variableMemory),
          returnLocation: frame.returnLocation,
          returnValueTarget: frame.returnValueTarget,
          procStartLine: frame.procStartLine,
          procEndLine: frame.procEndLine,
          procName: frame.procName,
          args: frame.args.map(arg => this.serializeVariable(arg)),
        })),
        forStack: this.forStack,
        tryStack: this.tryStack,
        lastError: this.lastError,
        procReturn: this.serializeVariable(this.procReturn),
        shouldReturn: this.shouldReturn,
        buffer: this.buffer,
        maxVariableCount: this.maxVariableCount,
        debugMode: this.debugMode,
         instructions: instructions ? instructions.map(inst => ({
           operation: inst.operation,
           args: inst.args,
           line: inst.line,
           jumpTarget: inst.jumpTarget,
           endForIndex: inst.endForIndex,
         })) : null,
         structDefinitions: Array.from(this.structDefinitions.entries()).map(([name, def]) => ({
           name,
           fields: Array.from(def.fields.entries()),
         })),
       };
       
       const serialized = JSON.stringify(state);
      const MAX_SIZE = 32767;
      
      if (serialized.length > MAX_SIZE) {
        throw new Error(
          `State size (${serialized.length} characters) exceeds maximum limit of ${MAX_SIZE} characters. ` +
          `Clear the output buffer, reduce variables, or use multiple checkpoints.`
        );
      }
      
      return serialized;
    }

   /**
    * Loads a previously saved VM state from a serialized string
    * Restores execution from where it left off with all runtime state intact
    * 
    * @param serializedState - The saved state string from saveState()
    * @returns The compiled instructions if they were included in the state, null otherwise
    * @throws Error if deserialization fails or state is corrupted
    */
    public loadState(serializedState: string): CompiledInstruction[] | null {
      try {
        if (serializedState.length > 32767) {
          throw new Error(
            `Serialized state (${serializedState.length} characters) exceeds maximum limit of 32767 characters`
          );
        }
        
        const state = JSON.parse(serializedState);
        
        this.uuid = state.uuid;
        this.counter = state.counter;
        this.waitTicks = state.waitTicks;
        this.variableMemory = this.deserializeVariableMap(state.variableMemory);
        this.jumpPoints = new Map(state.jumpPoints);
        this.procPoints = new Map(state.procPoints);
        this.procStack = state.procStack.map((frameData: any) => ({
          variableMemory: this.deserializeVariableMap(frameData.variableMemory),
          returnLocation: frameData.returnLocation,
          returnValueTarget: frameData.returnValueTarget,
          procStartLine: frameData.procStartLine,
          procEndLine: frameData.procEndLine,
          procName: frameData.procName,
          args: frameData.args.map((arg: any) => this.deserializeVariable(arg)),
        }));
         this.forStack = state.forStack;
         this.tryStack = state.tryStack || [];
         this.lastError = state.lastError || "";
         this.procReturn = this.deserializeVariable(state.procReturn);
         this.shouldReturn = state.shouldReturn;
         this.buffer = state.buffer;
         this.maxVariableCount = state.maxVariableCount;
         this.debugMode = state.debugMode;

         // Restore struct definitions
         this.structDefinitions.clear();
         if (state.structDefinitions) {
           for (const structDef of state.structDefinitions) {
             this.structDefinitions.set(structDef.name, {
               name: structDef.name,
               fields: new Map(structDef.fields),
             });
           }
         }
         
         // Return instructions if they were saved
         if (state.instructions) {
           return state.instructions as CompiledInstruction[];
         }
        
        return null;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to load VM state: ${errorMsg}`);
      }
    }

   /**
    * Serializes a Variable object to a JSON-compatible format
    */
   private serializeVariable(variable: Variable): any {
     return {
       type: variable.type,
       value: variable.value,
     };
   }

   /**
    * Deserializes a Variable object from JSON format
    */
    private deserializeVariable(data: any): Variable {
      switch (data.type) {
        case PanSparkType.Number:
          return Num(data.value);
        case PanSparkType.String:
          return Str(data.value);
        case PanSparkType.List:
          return List(data.value);
        case PanSparkType.Struct: {
          const structData = new Map();
          for (const [key, val] of Object.entries(data.value.data || {})) {
            structData.set(key, this.deserializeVariable(val));
          }
          return Struct({ structName: data.value.structName, data: structData });
        }
        default:
          throw new Error(`Unknown variable type: ${data.type}`);
      }
    }

   /**
    * Serializes a Map of variables to an array of [key, serialized_variable] pairs
    */
   private serializeVariableMap(varMap: Map<string, Variable>): Array<[string, any]> {
     return Array.from(varMap.entries()).map(([key, value]) => [
       key,
       this.serializeVariable(value),
     ]);
   }

   /**
    * Deserializes a Map of variables from an array of [key, serialized_variable] pairs
    */
   private deserializeVariableMap(data: Array<[string, any]>): Map<string, Variable> {
     const varMap = new Map<string, Variable>();
     for (const [key, value] of data) {
       varMap.set(key, this.deserializeVariable(value));
     }
     return varMap;
   }

   // ============ QR CODE COMPRESSION ============

   /**
    * Compress PanSpark code for QR encoding by removing comments and unnecessary whitespace
    */
   public compressCode(code: string): string {
      // Process line by line - enforce that code uses newlines to separate statements
      return code
        .split('\n')
        .map(line => {
          // Remove inline comments
          const commentIdx = line.indexOf('//');
          const cleanLine = commentIdx > -1 ? line.substring(0, commentIdx) : line;
          return cleanLine.trim();
        })
        .filter(line => line.length > 0)
        .join('\n');  // Preserve newlines - they are REQUIRED by the language
    }

   /**
    * Abbreviate opcodes to save space for QR codes
    */
   private abbreviateOpcodes(compressed: string): string {
     const abbreviations: Record<string, string> = {
       'SET': 'S',
       'PRINT': 'P',
       'MATH': 'M',
       'IF': 'I',
       'JUMP': 'J',
       'POINT': 'PT',
       'LIST_CREATE': 'LC',
       'LIST_PUSH': 'LP',
       'LIST_GET': 'LG',
       'LIST_SET': 'LS',
       'LIST_SORT': 'LST',
       'CALL': 'C',
       'PROC': 'PR',
       'RETURN': 'R',
       'FOR': 'F',
       'ENDFOR': 'EF',
       'BREAK': 'B',
       'STRUCT': 'ST',
       'STRUCTEND': 'STE',
       'STRUCT_GET': 'STG',
       'STRUCT_SET': 'STS',
       'INC': 'IN',
       'DEC': 'DC',
     };

     let abbreviated = compressed;
     const sortedKeys = Object.keys(abbreviations).sort((a, b) => b.length - a.length);

     for (const opcode of sortedKeys) {
       const abbr = abbreviations[opcode];
       const regex = new RegExp(`\\b${opcode}\\b`, 'g');
       abbreviated = abbreviated.replace(regex, abbr);
     }

     return abbreviated;
   }

   /**
    * Expand abbreviated opcodes back to full form
    */
    private expandOpcodes(abbreviated: string): string {
      const expansions: Record<string, string> = {
        'S': 'SET',
        'P': 'PRINT',
        'M': 'MATH',
        'I': 'IF',
        'J': 'JUMP',
        'PT': 'POINT',
        'LC': 'LIST_CREATE',
        'LP': 'LIST_PUSH',
        'LG': 'LIST_GET',
        'LS': 'LIST_SET',
        'LST': 'LIST_SORT',
        'C': 'CALL',
        'PR': 'PROC',
        'R': 'RETURN',
        'F': 'FOR',
        'EF': 'ENDFOR',
        'B': 'BREAK',
        'ST': 'STRUCT',
        'STE': 'STRUCTEND',
        'STG': 'STRUCT_GET',
        'STS': 'STRUCT_SET',
        'IN': 'INC',
        'DC': 'DEC',
      };

      let expanded = abbreviated;
      const sortedKeys = Object.keys(expansions).sort((a, b) => b.length - a.length);

       for (const abbr of sortedKeys) {
         const opcode = expansions[abbr];
         const regex = new RegExp(`\\b${abbr}\\b`, 'g');
         expanded = expanded.replace(regex, opcode);
       }

       return expanded;
     }

   /**
    * Encode program code to QR-friendly format (base64)
    */
   public encodeForQR(code: string): string {
     const compressed = this.compressCode(code);
     const abbreviated = this.abbreviateOpcodes(compressed);
     return Buffer.from(abbreviated).toString('base64');
   }

   /**
    * Decode QR code data back to executable program
    */
   public decodeFromQR(qrData: string): string {
     const decoded = Buffer.from(qrData, 'base64').toString('utf-8');
     return this.expandOpcodes(decoded);
   }

   /**
    * Decode QR data to compiled instructions (ready to execute with run())
    */
   public decodeQRToInstructions(qrData: string): CompiledInstruction[] {
     const code = this.decodeFromQR(qrData);
     return this.compile(code);
   }

   /**
    * Get compression statistics for code
    */
   public getCompressionStats(originalCode: string): {
     original: number;
     compressed: number;
     abbreviated: number;
     base64: number;
     compressionRatio: number;
   } {
     const compressed = this.compressCode(originalCode);
     const abbreviated = this.abbreviateOpcodes(compressed);
     const base64 = Buffer.from(abbreviated).toString('base64');

     return {
       original: originalCode.length,
       compressed: compressed.length,
       abbreviated: abbreviated.length,
       base64: base64.length,
       compressionRatio: (abbreviated.length / originalCode.length) * 100,
     };
   }

   // ============ STRUCT SUPPORT ============

   /**
    * Get a struct definition by name
    */
   public getStructDefinition(name: string): StructDefinition | undefined {
     return this.structDefinitions.get(name);
   }

   /**
    * Create a new struct instance
    */
   public createStructInstance(structName: string): StructInstance {
     const def = this.structDefinitions.get(structName);
     if (!def) {
       throw new Error(`Struct definition "${structName}" not found`);
     }

     const data = new Map<string, Variable>();
     // Initialize all fields with default values based on type
     for (const [fieldName, fieldDef] of def.fields.entries()) {
       switch (fieldDef.type) {
         case 'number':
           data.set(fieldName, Num(0));
           break;
         case 'string':
           data.set(fieldName, Str(''));
           break;
         case 'list':
           data.set(fieldName, List([]));
           break;
       }
     }

     return {
       structName,
       data,
     };
   }

   /**
    * Get field from struct instance
    */
   public getStructField(instance: StructInstance, fieldName: string): Variable {
     if (!instance.data.has(fieldName)) {
       throw new Error(`Field "${fieldName}" not found in struct "${instance.structName}"`);
     }
     return instance.data.get(fieldName)!;
   }

   /**
    * Set field in struct instance with type checking
    */
   public setStructField(instance: StructInstance, fieldName: string, value: Variable): void {
     const def = this.structDefinitions.get(instance.structName);
     if (!def) {
       throw new Error(`Struct definition "${instance.structName}" not found`);
     }

     const fieldDef = def.fields.get(fieldName);
     if (!fieldDef) {
       throw new Error(`Field "${fieldName}" not defined in struct "${instance.structName}"`);
     }

     // Type checking
     if (fieldDef.type === 'number' && value.type !== PanSparkType.Number) {
       throw new Error(`Field "${fieldName}" expects number but got different type`);
     }
     if (fieldDef.type === 'string' && value.type !== PanSparkType.String) {
       throw new Error(`Field "${fieldName}" expects string but got different type`);
     }
     if (fieldDef.type === 'list' && value.type !== PanSparkType.List) {
       throw new Error(`Field "${fieldName}" expects list but got different type`);
     }

     instance.data.set(fieldName, value);
   }
}

export function createVM(): PanSparkVM {
  return new PanSparkVM();
}