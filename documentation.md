# PanSpark Scripting Language Documentation

Welcome to the PanSpark scripting language! PanSpark is a tick-based interpreted OpCode scripting language designed for predictable performance and ease of parsing.

## Language Overview

By design, PanSpark executes only one operation per line of code, making it highly predictable and easier to understand. The syntax is strict and specific, allowing for faster parsing and higher execution speed.

### Key Features

- **Type System**: PanSpark has three internal types for developers:
  - `Number`: JavaScript Number type
  - `String`: Text strings
  - `List`: Arrays of numbers
  
  However, for script writers, the language primarily works with numbers for most operations.

- **Data Piping**: The `>>` operator means piping or moving data. For example:
  ```
  SET 10 >> num1
  ```
  This moves the value `10` to a variable named `num1`.

- **Buffer Output**: PanSpark does not print anything directly. All output is saved to a buffer that can be retrieved after the program finishes running.

## OpCode Reference

### `SET` - Variable Assignment
Allows you to set a variable from a Number, String literal, or an existing variable. If only a variable name is provided, it defaults to 0.

**Syntax:**
```
SET (Number/String/variable) >> <variable>
SET <variable>
```

**Example:**
```
SET 10 >> num1
SET num1 >> result
SET counter        // Sets counter to 0
SET "Hello" >> greeting
SET "World" >> name
```

**String Literals:**
Strings are enclosed in double quotes and support escape sequences (see String Operations section).
```
SET "Hello World" >> message
SET "Line1\nLine2" >> multiline
SET "C:\\Users\\Documents" >> path
```

---

### `MATH` - Mathematical Operations
Performs mathematical operations on numbers or variables.

**Syntax (Binary operators):**
```
MATH (Number/variable) (operator) (Number/variable) >> (variable)
```

**Syntax (Unary operators):**
```
MATH (Number/variable) (operator) >> (variable)
```

**Available Operators:**
- **Binary operators**: `+`, `-`, `*`, `/`, `%`, `**`, `min`, `max`
- **Unary operators**: `sqrt`, `log`, `floor`, `ceil`, `sin`, `rand`, `cos`, `tan`, `abs`, `round`, `log10`, `exp`

**Examples:**
```
MATH 10 + 20 >> result
MATH num1 * num2 >> result
MATH num1 ceil >> result
MATH 16 sqrt >> result
MATH a * 2 + b / c - 3 >> result
MATH -5 >> neg  // Unary minus
MATH -(a + b) >> negated  // Unary minus on expression
```

**Unary Operators:**
- `-value` - Negation
- `+value` - Identity (returns the same value)

---

### `PRINT` - Print Variables
Prints variables or numbers to the output buffer.

**Syntax:**
```
PRINT (Number/variable)
```

**Example:**
```
PRINT 10
PRINT result
```

---

### `ECHO` - Print Strings
Prints string-based messages to the output buffer.

**Syntax:**
```
ECHO "(text)"
```

**Example:**
```
ECHO "Hello World!"
ECHO "Computation complete"
```

---

### `POINT` - Define Jump Location
Sets a named location within the code that can be jumped to.

**Syntax:**
```
POINT (name)
```

**Example:**
```
POINT loop
POINT something
```

---

### `JUMP` - Unconditional Jump
Jumps to an existing point unconditionally.

**Syntax:**
```
JUMP (name)
```

**Example:**
```
JUMP loop
JUMP something
```

**Note:** When inside a procedure (PROC), you cannot jump outside the procedure's scope.

---

### `IF` - Conditional Jump
Conditionally jumps to a point based on a comparison.

**Syntax:**
```
IF (Number/variable) (operator) (Number/variable) >> (point)
```

**Available Operators:**
- `>` - Greater than
- `<` - Less than
- `==` - Equal to
- `!=` - Not equal to
- `>=` - Greater than or equal to
- `<=` - Less than or equal to

**Examples:**
```
IF 5 < 10 >> loop
IF num1 == num2 >> something
IF counter >= 100 >> end_loop
```

---

### `END` - End Program
Terminates the program execution.

**Syntax:**
```
END
```

**Example:**
```
END
```

---

### `FOR` - Define a FOR loop
Defines a for loop with an iteration variable, start value, end value, and optional step.

**Syntax:**
```
FOR (iterator) (start) (end) [step]
ENDFOR
```

**Parameters:**
- `iterator` - Variable name for the loop counter
- `start` - Starting value (inclusive)
- `end` - Ending value (inclusive)
- `step` - Optional step size (default: 1, can be negative for reverse loops)

**Important Notes:**
- FOR loops can be nested but it will impact performance
- Step must be non-zero and cannot change direction (positive step: end >= start, negative step: end <= start)

**Examples:**
```
FOR i 0 5      // Loop from 0 to 5, step 1 (default)
  PRINT i
ENDFOR

FOR i 0 10 2   // Loop from 0 to 10, step 2
  PRINT i
ENDFOR

FOR i 10 0 -1  // Reverse loop from 10 to 0
  PRINT i
ENDFOR

FOR i 10 0 -2  // Reverse loop from 10 to 0, step -2
  PRINT i
ENDFOR
```

---

### `BREAK` - Breaks out of a FOR loop

**Syntax:**
```
BREAK
```

**Example:**
```
FOR i num1 num2
  PRINT i
  BREAK
ENDFOR
```

---

### `CONTINUE` -  Continues a FOR loop

**Syntax:**
```
CONTINUE
```

**Example:**
```
FOR i 0 5
  IF i == 2 JUMP skip
  PRINT i
  JUMP next
  POINT skip
  CONTINUE
  POINT next
ENDFOR
```

---

### `PROC` - Define Procedure
Defines a procedure (function) with isolated memory scope. Procedures can accept parameters and return values.

**Syntax:**
```
PROC (name) ((variables separated by ,))
  // procedure body
ENDPROC
```

**Important Notes:**
- The name must be separated from the argument parentheses
- Use `ENDPROC` to mark the end of the procedure
- Procedures have their own isolated memory layer
- Cannot jump outside of a procedure's scope
- Arguments defined in the procedure can be used within it

**Example:**
```
PROC add (a, b)
  MATH a + b >> result
  RETURN result
ENDPROC

PROC square (x)
  MATH x * x >> squared
  RETURN squared
ENDPROC
```

---

### `RETURN` - Return from Procedure
Returns a value from a procedure. If no value is specified, returns 0.

**Syntax:**
```
RETURN (Number/variable)
RETURN
```

**Example:**
```
PROC add (a, b)
  MATH a + b >> result
  RETURN result
ENDPROC

PROC doSomething ()
  ECHO "Done"
  RETURN
ENDPROC
```

---

### `CALL` - Call Procedure
Calls a defined procedure with arguments and optionally stores the return value.

**Syntax:**
```
CALL (PROC name) ((arguments)) >> (variable)
CALL (PROC name) ((arguments))
```

**Example:**
```
CALL add (1, 3) >> result
CALL square (5) >> squared_value
PRINT result
```

---

### `WAIT` - Wait for Ticks
Pauses execution for a specified number of ticks.

**Syntax:**
```
WAIT (Number/variable)
```

**Example:**
```
WAIT 100
WAIT delay_time
```

---

### `INC` - Increment
Increments a variable by 1.

**Syntax:**
```
INC (variable)
```

**Example:**
```
SET 0 >> counter
INC counter
PRINT counter  // outputs: 1
```

---

### `DEC` - Decrement
Decreases a variable by 1.

**Syntax:**
```
DEC (variable)
```

**Example:**
```
SET 10 >> counter
DEC counter
PRINT counter  // outputs: 9
```

---

### `FREE` - Free Memory
Frees a variable from memory, removing it completely.

**Syntax:**
```
FREE (variable)
```

**Example:**
```
SET 100 >> temp
PRINT temp
FREE temp
```

---

### `NOP` - No Operation
No operation instruction. Does nothing. Useful as a placeholder or for timing.

**Syntax:**
```
NOP
```

**Example:**
```
NOP
```

---

### `MEMDUMP` - Memory Dump
Dumps all available variable memory to the output buffer. Shows both global memory and procedure-local memory (if inside a procedure).

**Syntax:**
```
MEMDUMP
```

**Example:**
```
SET 10 >> x
SET 20 >> y
MEMDUMP
```

**Output Format:**
```
DUMPING MEMORY at line X
  [GLOBAL MEMORY]
    x: 10
    y: 20
END OF MEMORY DUMP
```

---

### `MEMSTATS` - Memory Statistics
Displays or stores memory usage statistics including variable counts, estimated memory usage, procedure depth, and remaining variable capacity.

**Syntax:**
```
MEMSTATS
MEMSTATS >> variable
```

**Examples:**
```
SET 10 >> x
SET 20 >> y
SET "hello" >> greeting
MEMSTATS
```

**Output Format (to buffer):**
```
=== MEMORY STATISTICS ===
Global Variables: 3
Local Variables: 0
Global Memory: ~50 bytes
Local Memory: ~0 bytes
Procedure Depth: 0
Total Ticks: 3
```

**Example (storing to variable):**
```
SET 10 >> x
MEMSTATS >> stats
PRINT stats
```

**Output (to variable):**
```
STATS:GlobalVars=1,LocalVars=0,GlobalMem=8B,LocalMem=0B,ProcDepth=0
```

**Features:**
- Counts global and local variables
- Estimates memory usage (rough approximation)
- Shows current procedure nesting depth
- Displays remaining variable capacity (if limit is set)
- Shows total execution ticks
- Can store stats as a string for programmatic access

---

### `TICK` - Get Current Tick
Saves the current execution tick/instruction counter to a variable.

**Syntax:**
```
TICK (variable)
```

**Example:**
```
TICK current_tick
PRINT current_tick
```

---

## String Operations

PanSpark provides built-in operations for working with strings.

### `CONCAT` - Concatenate Strings
Concatenates two strings together and stores the result in a variable.

**Syntax:**
```
CONCAT (string/number) (string/number) >> (variable)
```

**Example:**
```
SET "Hello" >> greeting
SET " World" >> name
CONCAT greeting name >> message
ECHO message  // outputs: "Hello World"

SET 42 >> answer
CONCAT "The answer is " answer >> full_message
ECHO full_message  // outputs: "The answer is 42"
```

---

### `STRLEN` - Get String Length
Returns the length of a string.

**Syntax:**
```
STRLEN (string/number/variable) >> (variable)
```

**Example:**
```
SET "Hello" >> text
STRLEN text >> len
PRINT len  // outputs: 5

STRLEN "PanSpark" >> lang_len
PRINT lang_len  // outputs: 8
```

---

### `SUBSTR` - Extract Substring
Extracts a substring from a string between two indices.

**Syntax:**
```
SUBSTR (string/number/variable) (start_index) (end_index) >> (variable)
```

**Parameters:**
- `start_index` - Starting position (inclusive)
- `end_index` - Ending position (exclusive)

**Example:**
```
SET "Hello World" >> text
SUBSTR text 0 5 >> first_word
ECHO first_word  // outputs: "Hello"

SUBSTR text 6 11 >> second_word
ECHO second_word  // outputs: "World"

SET "JavaScript" >> lang
SUBSTR lang 4 10 >> portion
ECHO portion  // outputs: "Script"
```

---

### String Escape Sequences

Strings support the following escape sequences:

| Escape | Description |
|--------|-------------|
| `\"` | Double quote |
| `\\` | Backslash |
| `\n` | Newline |
| `\t` | Tab character |
| `\r` | Carriage return |

**Examples:**
```
ECHO "Line 1\nLine 2"           // Outputs two lines
ECHO "Column1\tColumn2"         // Outputs with tab separator
ECHO "She said \"Hello\""       // Outputs: She said "Hello"
ECHO "Path: C:\\Users\\Docs"    // Outputs: Path: C:\Users\Docs
```

---

### Unary Operator Enhancements

The MATH operation now supports unary plus and minus operators:

**Unary Minus:**
```
MATH -5 >> x
PRINT x  // outputs: -5

SET 10 >> num
MATH -num >> negated
PRINT negated  // outputs: -10

MATH -(3 + 4) >> result
PRINT result  // outputs: -7
```

**Unary Plus:**
```
MATH +5 >> x
PRINT x  // outputs: 5
```

---

## List Operations

PanSpark provides built-in operations for working with lists of numbers.

### `LIST_CREATE` - Create List
Creates a new empty list variable.

**Syntax:**
```
LIST_CREATE (list_name)
```

**Example:**
```
LIST_CREATE list1
LIST_CREATE myNumbers
```

---

### `LIST_PUSH` - Add Element
Adds a number to the end of a list.

**Syntax:**
```
LIST_PUSH (Number/variable) >> (list_name)
```

**Example:**
```
LIST_CREATE list1
LIST_PUSH 10 >> list1
LIST_PUSH 20 >> list1
LIST_PUSH num1 >> list1
```

---

### `LIST_SET` - Set Element
Sets a value at a specific index in the list.

**Syntax:**
```
LIST_SET (Number/variable) (index) >> (list_name)
```

**Example:**
```
LIST_CREATE list1
LIST_PUSH 10 >> list1
LIST_PUSH 20 >> list1
LIST_SET 999 0 >> list1  // Sets first element to 999
```

---

### `LIST_GET` - Get Element
Gets a value from a specific index in the list and stores it in a variable.

**Syntax:**
```
LIST_GET (list_name) (index) >> (variable)
```

**Example:**
```
LIST_CREATE list1
LIST_PUSH 10 >> list1
LIST_PUSH 20 >> list1
LIST_GET list1 0 >> first_element
PRINT first_element  // outputs: 10
```

---

### `LIST_SORT` - Sort List
Sorts the list in ascending or descending order.

**Syntax:**
```
LIST_SORT (list_name) (min/max)
```

**Parameters:**
- `min` - Sorts from lowest to highest (ascending)
- `max` - Sorts from highest to lowest (descending)

**Example:**
```
LIST_CREATE list1
LIST_PUSH 50 >> list1
LIST_PUSH 10 >> list1
LIST_PUSH 30 >> list1
LIST_SORT list1 min  // Sorts: [10, 30, 50]
LIST_SORT list1 max  // Sorts: [50, 30, 10]
```

---

## Comments

Comments are lines or portions of lines that are ignored during execution. PanSpark supports two comment styles:

**Full-line comments:** Lines starting with `//` are completely ignored.

**Inline comments:** The `//` marker and everything after it on a line is ignored, allowing you to add comments after instructions.

**Examples:**
```
// This is a full-line comment

SET 10 >> num1           // Inline comment: This sets num1 to 10
MATH num1 * 2 >> result  // Another inline comment
PRINT result             // Prints the result
```

**Output:**
```
20
```

**Features:**
- Full-line comments: `// Comment text`
- Inline comments: Any line can have `// comment` at the end
- Comments can contain any characters, including multiple `/` marks
- Comments are stripped before tokenization, so they don't affect performance

---

## Creating Custom OpCodes

You can extend PanSpark by creating custom OpCodes. Here's how:

### Module Structure

Create a module file (e.g., `mymodule.ts`) with a `registerWith` function:

```typescript
import { PanSparkVM, OpCodeHandler, InterpreterContext } from './vm';

export function registerWith(vm: PanSparkVM): void {
  vm.registerOpCode("MY_OPCODE", (args, context) => {
    // Your implementation here
    // args: string[] - The arguments passed to your opcode
    // context: InterpreterContext - Access to the interpreter
  });
}
```

### InterpreterContext Interface

The context object provides access to:

```typescript
export interface InterpreterContext {
  buffer: string[];                        // Output buffer
  variableMemory: Map<string, Variable>;   // Global variable memory
  procVariableMemory: Map<string, Variable>; // Procedure-local memory
  procLock: boolean;                       // True if inside a procedure
  getVar: (name: string, line: number) => Variable;  // Get a variable safely
  setVar: (name: string, value: Variable) => void;   // Set a variable
}
```

### Variable Types

Variables use a discriminated union type:

```typescript
type Variable =
  | { type: PanSparkType.Number; value: number }
  | { type: PanSparkType.String; value: string }
  | { type: PanSparkType.List; value: number[] };
```

Helper functions:
```typescript
const Num = (value: number): Variable => ({ type: PanSparkType.Number, value });
const Str = (value: string): Variable => ({ type: PanSparkType.String, value });
const List = (value: number[]): Variable => ({ type: PanSparkType.List, value });
```

### Example: Custom OpCode

```typescript
export function registerWith(vm: PanSparkVM): void {
  vm.registerOpCode("DOUBLE", (args, context) => {
    // DOUBLE varName >> result
    const inputVar = context.getVar(args[0], 0);
    
    if (inputVar.type === PanSparkType.Number) {
      const doubled = Num(inputVar.value * 2);
      context.setVar(args[2], doubled);
    } else {
      throw new Error("DOUBLE requires a numeric variable");
    }
  });
}
```

Usage in PanSpark:
```
IMPORT "mymodule"
SET 5 >> x
DOUBLE x >> result
PRINT result  // outputs: 10
```

undefined

### Basic Usage

```typescript
import { PanSparkVM } from "./panspark";

const vm1 = new PanSparkVM();

let code: string = `
SET 10 >> num1
SET 20 >> num2
SET result
MATH num1 + num2 >> result
PRINT result`;

const program1 = vm1.run(vm1.compile(code));

while (program1.next().done === false) {
}

for (let line of vm1.buffer) {
  console.log(line);
}

vm1.resetVM();
```

---

## Debugging & Performance Features

### Debug Mode

Enable verbose execution tracing to see each instruction as it executes:

```typescript
const vm = new PanSparkVM();
vm.setDebugMode(true);

const code = `
  SET 5 >> x
  MATH x * 2 >> y
  PRINT y
`;

const program = vm.run(vm.compile(code));
while (program.next().done === false) {}

// Buffer will contain debug output like:
// [DEBUG] Line 1: SET [5, >>, x] (tick: 0)
// [DEBUG] Line 2: MATH [x, *, 2, ...] (tick: 1)
// [DEBUG] Line 3: PRINT [y] (tick: 2)
// 10
```

Debug mode shows:
- Each instruction executed
- Instruction arguments (first 3 shown)
- Line number in script
- Execution tick (instruction counter)

### Variable Count Limiting

Restrict the number of variables a VM can create. Useful for sandboxing or resource management:

```typescript
const vm = new PanSparkVM();

// Allow maximum 16 unique variables
vm.setMaxVariableCount(16);

const code = `
  SET 1 >> a
  SET 2 >> b
  // ... up to 16 different variable names allowed
`;

const program = vm.run(vm.compile(code));
while (program.next().done === false) {}
```

**Important Notes:**
- Limit applies to the number of **unique variable names**, not total memory
- You can **overwrite** existing variables without counting against the limit
- Use `FREE` to remove variables and create new ones
- Set to `null` (default) for unlimited variables
- Throws error when limit is exceeded

```typescript
// Get current variable count
const count = vm.getVariableCount();

// Get current limit
const limit = vm.getMaxVariableCount();
```

---

## Expression Evaluation

### AST-Based Evaluation

PanSpark uses a modern Abstract Syntax Tree (AST) for evaluating mathematical expressions. This provides:

- **Correct operator precedence**: `2 + 3 * 4` evaluates to `14` (not `20`)
- **Right-associative power**: `2 ** 3 ** 2` evaluates to `512` (not `64`)
- **Proper parenthesis handling**: Complex nested expressions work correctly
- **Clean, maintainable code**: Recursive descent parser with clear structure

### Supported Operations

| Operator | Precedence | Description |
|----------|-----------|-------------|
| `()` | Highest | Parentheses (grouping) |
| `-x`, `+x` | High | Unary minus/plus |
| `**` | High | Exponentiation (right-associative) |
| `*`, `/`, `%` | Medium | Multiplication, division, modulo |
| `+`, `-` | Low | Addition, subtraction |

### Examples

```
MATH 2 + 3 * 4 >> x         // x = 14 (not 20)
MATH (2 + 3) * 4 >> x       // x = 20
MATH 2 ** 3 >> x            // x = 8
MATH 2 ** 3 ** 2 >> x       // x = 512 (right-associative)
MATH -(5 + 3) >> x          // x = -8 (unary negation on expression)
MATH 10 / 2 + 3 * 4 >> x    // x = 17
```

---

## Performance Optimizations

The PanSpark VM includes several optimizations:

- **Incremental FOR depth checking**: Depth is tracked during compilation (O(1) per instruction) instead of O(n²) lookup
- **Pre-compiled instructions**: Jump targets and custom handlers are cached during compilation
- **FOR loop optimization**: ENDFOR indices are pre-computed during compilation to eliminate runtime O(n) lookups
- **Inline math operations**: Common operators are inlined for faster execution
- **Object pooling**: Stack frames for procedure calls are reused
- **Batch execution**: Sequential non-blocking instructions can be processed together
- **Recursive depth limiting**: Prevents stack overflow with configurable recursion limits (default: 1000)
- **Step-based FOR loops**: Support for forward and reverse iteration with configurable step sizes

### Compilation Performance

- **Single-pass tokenization**: No redundant parsing
- **Pre-resolved jump points**: Jump targets validated and cached at compile time
- **Depth tracking optimization**: FOR/ENDFOR matching done in O(n) single pass, not O(n²)

These optimizations are transparent to script writers but provide significant performance benefits, especially for complex programs with nested loops and large scripts.

---

## Error Handling

PanSpark provides detailed error messages including:
- Line numbers where errors occurred
- Description of what went wrong
- Suggestions for fixing common issues

Common errors:
- **Undefined variable**: Variable not set before use
- **Undefined jump point**: JUMP/IF referencing non-existent POINT
- **Out of scope jump**: Attempting to JUMP outside procedure boundaries
- **Type mismatch**: Using string/list where number expected
- **Invalid syntax**: Malformed OpCode usage

---

## Best Practices

1. **Initialize variables**: Always use `SET` before using a variable (or use `SET varname` to default to 0)
2. **Free unused variables**: Use `FREE` to clean up memory when variables are no longer needed
3. **Use procedures**: Break complex logic into reusable procedures
4. **Comment your code**: Use `//` to explain complex sections
5. **Check bounds**: When using list operations, validate indices
6. **Handle errors**: Use conditional checks before operations that might fail

---

## Example Programs

### Simple Counter
```
SET counter  // Defaults to 0
POINT loop
  PRINT counter
  INC counter
  IF counter < 10 >> loop
END
```

### Factorial Calculator
```
PROC factorial (n)
  IF n <= 1 >> base_case
  MATH n - 1 >> n_minus_1
  CALL factorial (n_minus_1) >> result
  MATH n * result >> final
  RETURN final
  
  POINT base_case
  RETURN 1
ENDPROC

SET 5 >> input
CALL factorial (input) >> result
PRINT result  // outputs: 120
```

### Fibonacci Sequence
```
SET 0 >> a
SET 1 >> b
SET counter  // Defaults to 0

POINT loop
  PRINT a
  MATH a + b >> temp
  SET b >> a
  SET temp >> b
  INC counter
  IF counter < 10 >> loop
END
```

### Nested for loop example
```
FOR i 0 3
  FOR j 0 3
    IF j == 2 JUMP inner_break
    ECHO "Inner loop"
    JUMP inner_next
    POINT inner_break
    BREAK
    POINT inner_next
  ENDFOR
  ECHO "Outer loop"
ENDFOR
```

### List Operations Example
```
// Create and populate a list
LIST_CREATE numbers
LIST_PUSH 50 >> numbers
LIST_PUSH 10 >> numbers
LIST_PUSH 30 >> numbers
LIST_PUSH 40 >> numbers
LIST_PUSH 20 >> numbers

// Get and print first element
LIST_GET numbers 0 >> first
ECHO "First element:"
PRINT first

// Sort ascending
LIST_SORT numbers min
ECHO "Sorted (ascending):"
PRINT numbers

// Sort descending
LIST_SORT numbers max
ECHO "Sorted (descending):"
PRINT numbers

// Modify an element
LIST_SET 999 2 >> numbers
ECHO "After setting index 2 to 999:"
PRINT numbers
```

### String Operations Example
```
// Basic string concatenation
SET "Hello" >> greeting
SET " World" >> target
CONCAT greeting target >> message
ECHO message  // outputs: "Hello World"

// String length
STRLEN message >> len
ECHO "Length:"
PRINT len

// Substring operations
SUBSTR message 0 5 >> first_part
ECHO first_part  // outputs: "Hello"

SUBSTR message 6 11 >> second_part
ECHO second_part  // outputs: "World"

// String with escape sequences
SET "Line1\nLine2\nLine3" >> multiline
ECHO multiline

// Combining numbers and strings
SET 42 >> answer
SET "The answer is " >> prefix
CONCAT prefix answer >> full_answer
ECHO full_answer  // outputs: "The answer is 42"

// Using unary operators
MATH -10 >> negative
SET "Value: " >> label
CONCAT label negative >> result
ECHO result  // outputs: "Value: -10"
```

