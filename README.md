<img src="http://dev.verpitek.com:3000/_app/immutable/assets/favicon.CBf7ROhx.png" width=256>
# PanSpark

A tick-based interpreted OpCode scripting language designed for predictable performance and ease of parsing.

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)
![Status](https://img.shields.io/badge/status-active-success.svg)

## Features

- **One Operation Per Line**: Predictable execution model with strict syntax
- **High Performance**: Pre-compiled instructions and optimized execution
- **Extensible**: Easy-to-create custom OpCodes via module system
- **Built-in Types**: Numbers, Strings, and Lists with comprehensive operations
- **Procedures**: Isolated memory scopes with parameter passing and return values
- **Detailed Error Handling**: Clear error messages with line numbers
- **Memory Management**: Manual virtual memory control with `FREE` operation
- **List Operations**: Create, manipulate, and sort lists of numbers

## Getting Started

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
```

## Language Overview

PanSpark uses a simple, readable syntax where each line performs exactly one operation:

```panspark
// Variables
SET 10 >> x
SET y        // Defaults to 0

// Math operations
MATH x + 20 >> result
MATH result sqrt >> root

// Control flow
IF x > 5 >> do_something
JUMP end

POINT do_something
ECHO "x is greater than 5"

POINT end
END
```

### Working with Lists

```panspark
// Create and populate a list
LIST_CREATE numbers
LIST_PUSH 30 >> numbers
LIST_PUSH 10 >> numbers
LIST_PUSH 20 >> numbers

// Sort and access
LIST_SORT numbers min  // Sort ascending
LIST_GET numbers 0 >> smallest
PRINT smallest  // outputs: 10
```

### Procedures

```panspark
PROC factorial (n) {
  IF n <= 1 >> base_case
  MATH n - 1 >> n_minus_1
  CALL factorial (n_minus_1) >> result
  MATH n * result >> final
  RETURN final
  
  POINT base_case
  RETURN 1
}

CALL factorial (5) >> result
PRINT result  // outputs: 120
```

## Core OpCodes

| OpCode | Description | Example |
|--------|-------------|---------|
| `SET` | Assign variable | `SET 10 >> x` or `SET x` |
| `MATH` | Math operations | `MATH x + y >> result` |
| `PRINT` | Output number/variable | `PRINT result` |
| `ECHO` | Output string | `ECHO "Hello"` |
| `IF` | Conditional jump with logic | `IF x > 10 >> label` or `IF x > 5 AND y < 20 >> label` |
| `JUMP` | Unconditional jump | `JUMP start` |
| `POINT` | Define jump target | `POINT start` |
| `PROC` | Define procedure | `PROC add (a, b) { ... }` |
| `CALL` | Call procedure | `CALL add (1, 2) >> sum` |
| `FOR`/`ENDFOR` | Loop construct | `FOR i 1 10 >> body` |
| `TRY`/`CATCH`/`ENDTRY` | Error handling | `TRY err CATCH ENDTRY` |
| `TYPEOF` | Get variable type | `TYPEOF x >> type` |

## List Operations

| OpCode | Description | Example |
|--------|-------------|---------|
| `LIST_CREATE` | Create empty list | `LIST_CREATE mylist` |
| `LIST_PUSH` | Add element to list | `LIST_PUSH 10 >> mylist` |
| `LIST_GET` | Get element from list | `LIST_GET mylist 0 >> value` |
| `LIST_SET` | Modify element | `LIST_SET 20 0 >> mylist` |
| `LIST_SORT` | Sort list | `LIST_SORT mylist min` |
| `LIST_LENGTH` | Get list length | `LIST_LENGTH mylist >> len` |
| `LIST_REVERSE` | Reverse list | `LIST_REVERSE mylist >> reversed` |
| `LIST_FIND` | Find element index | `LIST_FIND mylist 20 >> index` |
| `LIST_CONTAINS` | Check if contains | `LIST_CONTAINS mylist 30 >> found` |
| `LIST_REMOVE` | Remove element | `LIST_REMOVE mylist 1 >> removed` |

## String Operations

| OpCode | Description | Example |
|--------|-------------|---------|
| `CONCAT` | Concatenate strings | `CONCAT str1 str2 >> result` |
| `STRLEN` | Get string length | `STRLEN str >> len` |
| `SUBSTR` | Extract substring | `SUBSTR str 0 5 >> result` |
| `STR_UPPER` | Convert to uppercase | `STR_UPPER str >> upper` |
| `STR_LOWER` | Convert to lowercase | `STR_LOWER str >> lower` |
| `STR_TRIM` | Remove whitespace | `STR_TRIM str >> trimmed` |
| `STR_REPLACE` | Replace text | `STR_REPLACE str find replace >> result` |
| `STR_CONTAINS` | Check substring | `STR_CONTAINS str substr >> found` |
| `STR_CHAR` | Get character at index | `STR_CHAR str 0 >> char` |

## Advanced Features

### Logical Operators in Conditionals

Use `AND`, `OR`, and `NOT` for complex conditions:

```panspark
SET 10 >> x
SET 20 >> y

// AND operator
IF x < 15 AND y > 10 >> both_true
ECHO "One condition failed"
JUMP end

POINT both_true
ECHO "Both conditions are true"

// OR operator
IF x > 20 OR y < 15 >> either_true
JUMP end

POINT either_true
ECHO "At least one condition is true"

// NOT operator
IF NOT x >> x_is_zero
ECHO "X is not zero"

POINT x_is_zero
ECHO "X is zero"

POINT end
```

### Type Checking with TYPEOF

```panspark
SET 42 >> num
SET "hello" >> str
LIST_CREATE mylist

TYPEOF num >> type1
TYPEOF str >> type2
TYPEOF mylist >> type3
TYPEOF undefined_var >> type4

PRINT type1  // outputs: number
PRINT type2  // outputs: string
PRINT type3  // outputs: list
PRINT type4  // outputs: undefined
```

### Error Handling with TRY-CATCH

PanSpark includes a humorous error handling system! When an error is caught, it's prefixed with "☠️ OH NOES! 💥":

```panspark
TRY error
  // Code that might fail
  MATH 10 / 0 >> result  // This will throw!
  ECHO "This won't execute"
CATCH
  // Handle the error
  PRINT error  // outputs: ☠️ OH NOES! Division by zero error: cannot divide 10 by 0 💥
ENDTRY

// You can also manually throw errors
TRY err
  THROW "Something went wrong!"
CATCH
  PRINT err  // outputs: Something went wrong!
ENDTRY
```

## Creating Custom OpCodes

Extend PanSpark with your own operations:

```typescript
// mymodule.ts
import { PanSparkVM } from 'panspark';

export function registerWith(vm: PanSparkVM): void {
  vm.registerOpCode("DOUBLE", (args, context) => {
    const inputVar = context.getVar(args[0], 0);
    if (inputVar.type === PanSparkType.Number) {
      const doubled = Num(inputVar.value * 2);
      context.setVar(args[2], doubled);
    }
  });
}
```

Use in PanSpark:
```panspark
IMPORT "mymodule"
SET 5 >> x
DOUBLE x >> result
PRINT result  // outputs: 10
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by the Sparc asm, BASIC and esoteric languages
- Built with TypeScript to save the people working on it from insanity
- Designed for educational purposes and embedded scripting scenarios

---

<p align="center">Made with insanity and sillyness by Verpitek</p>
