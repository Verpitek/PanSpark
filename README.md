Welcome to the PanSpark acripting language
By design it is a tick based interpreted OpCode scripting language
Every line of code in the PansPark language only executes 1 operation, which makes it have predictable performance and somewhat easier to understand and parse

the syntax of PanSpark is somewhat strict and specific, but this allows for once again... faster parsing and higher speed

PanSpark itself has only one type, that being the JavaScript `Number` type

Also last bit, the `>>` means piping or moving of data, so things like `SET 10 >> num1` would mean moving 10 to variable with name `num`

PanSpark itself does not print anything itself, and saves everything to a buffer, that can be printed out after a program finishes running

# OpCodes
### `SET`: allows you to set a variable from a `Number` or a an existing variable.
  Syntax:
  `SET (Number/variable) >> <variable>`
  Example usage: 
  `SET 10 >> num1` or `SET num1 >> result`

 ### `MATH`: allows to do math operations
  Syntax:
  `MATH (Number/variable) (operator) (Number/variable) >> (variable)`
  or if the operator is used with a single argument
  `MATH (Number/variable) (operator) >> (variable)`
  if the operator is used with a single argument
  
  Available operators:
  two argument operators `+ - * / % ** min max`
  single argument operators `sqrt log floor ceil sin rand cos tan abs round log10 exp`
  Example usage:
  `MATH 10 + 20 >> result` or `MATH num1 * num2 >> result` or `MATH num1 ceil >> result`
  
  ### `PRINT`: allows printing of variables or Numbers
  Syntax:
  `PRINT (Number/variable)`
  
  Example usage:
  `PRINT 10` or `PRINT result`
  
  ### `ECHO`: allows printing string based messages
  Syntax:
  `ECHO "(text)"`
  
  Example usage:
  `ECHO "Hello World!"`
  
  ### `POINT`: allows setting a set location within the code
  Syntax:
  `POINT (name)`
  
  Example usage:
  `POINT loop` or `POINT something`
  
  ### `JUMP`: allows jumping to an existing point
  Syntax
  `JUMP (name)`
  
  Example usage:
  `JUMP loop` or `JUMP something`
  
  ### `IF`: allows conditional jumping to points
  Syntax:
  `IF (Number/variable) (operator) (Number/variable) >> (point)`
  
  Available operators:
  `> < == != >= <=`
  
  Example usage:
  `IF 5 < 10 >> loop` or `IF num1 == num2 >> something`
  
  ### `END` ends the program
  Syntax and Example usage:
  `END`
  
  ### `PROC` allows to define a procedure, which has its isolated memory layer
  Syntax:
  ```
  PROC (name) ( (variables seperated by ,) ) {
  }
  ```
  P.S. the name has to be seperated from the argument (), and the shown way is the only way to write a PROC using squiggly brackets.
  PROC's cannot be jump outside of, since it runs on a seperate memory layer, this can cause `out of scope` issues
  Arguments that are in the PROC's definition can be used within the PROC
  
  Example Usage:
  ```
  PROC add (a, b) {
    MATH a + b >> result
    RETURN result
  }
  ```

  ### `RETURN` returns a value from a procedure
  Syntax:
  `RETURN (Number/variable)`
  
  Example usage:
  ```
  PROC add (a, b) {
    MATH a + b >> result
    RETURN result
  }
  ```
  ### `CALL` allows to call a procedure
  Syntax:
  `CALL (PROC name) ( (arguments) ) >> (variable)`
  
  Example usage:
  ```
  CALL add (1, 3) >> result
  ```
  ### `WAIT` allows to wait for a specific amount of ticks
  Syntax:
  `WAIT (Number/variable)`

  Example usage:
  `WAIT 100` or `WAIT num1`
  ### `INC`: increments a variable by 1
  Syntax:
  `INC (variable)`
  Example usage:
  `INC num1`
  ### `DEC`: decreases a variable by 1
  Syntax:
  `DEC (variable)
  Example usage:
  `DEC num1`
  ### `FREE`: frees a variable from memory
  Syntax:
  `FREE (variable)`
  Example usage:
  `FREE num1`
  ### `NOP`: No operation instruction, does nothing
  Syntax and Example usage:
  `NOP`
  ### `MEMDUMP`: dumps all available variable memory
  Syntax and Example usage:
  `MEMDUMP`
  ### `TICK` allows to save the current tick to a variable
  Syntax:
  `TICK (variable)`
  Example usage:
  `TICK num1`
  ### `IMPORT`: allows to import custom OpCodes
  Syntax:
  `IMPORT "(name)"`
  Example usage:
  `IMPORT "list"`
  
  
  
  # Creating new OpCodes
  
  in the `/std/list.ts` file there is an example library that shows how to register OpCodes
  
  the only thing that is worth more interest is this line of code
  `vm.registerOpCode("LIST_CREATE", (args, context) => {`
  `"LIST_CREATE"` here represents a custom OpCode name, that you can define yourself
  `args` gives you the arguments from the custom OpCode
  `context` gives you access to the interpreter context, which allows you to directly check or edit memory and other things based on the interface below
  ```js
  export interface InterpreterContext {
    variableMemory: Map<string, number>;
    procVariableMemory: Map<string, number>;
    procLock: boolean;
    getVar: (name: string, line: number) => number;
    setVar: (name: string, value: number) => void;
  }
  ```
  
  # Running PanSpark
  you can find examples of how to run PanSpark inside the `main.ts` file
