import { PanSparkVM } from "./panspark";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function runTest(name: string, testFn: () => void): void {
  try {
    testFn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg });
    console.log(`✗ ${name}: ${errorMsg}`);
  }
}

function runCode(code: string): string[] {
  const vm = new PanSparkVM();
  const program = vm.run(vm.compile(code));
  while (program.next().done === false) {}
  return vm.buffer;
}

function expectOutput(code: string, expectedOutput: string[]): void {
  const output = runCode(code);
  if (output.length !== expectedOutput.length) {
    throw new Error(
      `Expected ${expectedOutput.length} output lines, got ${output.length}. Output: ${JSON.stringify(output)}`
    );
  }
  for (let i = 0; i < expectedOutput.length; i++) {
    if (output[i] !== expectedOutput[i]) {
      throw new Error(
        `Line ${i}: expected "${expectedOutput[i]}", got "${output[i]}"`
      );
    }
  }
}

function expectOutputContains(code: string, substring: string): void {
  const output = runCode(code);
  const fullOutput = output.join("\n");
  if (!fullOutput.includes(substring)) {
    throw new Error(
      `Output does not contain "${substring}". Full output: ${JSON.stringify(
        output
      )}`
    );
  }
}

function expectError(code: string, errorPattern?: string | RegExp): void {
  try {
    runCode(code);
    throw new Error("Expected code to throw an error but it did not");
  } catch (error) {
    if (errorPattern) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      const pattern =
        errorPattern instanceof RegExp
          ? errorPattern
          : new RegExp(errorPattern);
      if (!pattern.test(errorMsg)) {
        throw new Error(
          `Error message does not match pattern. Expected: ${errorPattern}, Got: ${errorMsg}`
        );
      }
    }
  }
}

// ==================== BASIC OPERATIONS ====================
console.log("\n=== BASIC OPERATIONS ===\n");

runTest("SET - Set a number variable", () => {
  const code = `
    SET 42 >> x
    PRINT x
  `;
  expectOutput(code, ["42"]);
});

runTest("SET - Set variable from another variable", () => {
  const code = `
    SET 100 >> a
    SET a >> b
    PRINT b
  `;
  expectOutput(code, ["100"]);
});

runTest("SET - Default to 0 when no value", () => {
  const code = `
    SET counter
    PRINT counter
  `;
  expectOutput(code, ["0"]);
});

runTest("ECHO - Print string", () => {
  const code = `
    ECHO "Hello World"
  `;
  expectOutput(code, ["Hello World"]);
});

runTest("PRINT - Print number", () => {
  const code = `
    PRINT 123
  `;
  expectOutput(code, ["123"]);
});

runTest("PRINT - Print variable", () => {
  const code = `
    SET 555 >> num
    PRINT num
  `;
  expectOutput(code, ["555"]);
});

// ==================== MATH OPERATIONS ====================
console.log("\n=== MATH OPERATIONS ===\n");

runTest("MATH - Addition", () => {
  const code = `
    MATH 10 + 20 >> result
    PRINT result
  `;
  expectOutput(code, ["30"]);
});

runTest("MATH - Subtraction", () => {
  const code = `
    MATH 100 - 30 >> result
    PRINT result
  `;
  expectOutput(code, ["70"]);
});

runTest("MATH - Multiplication", () => {
  const code = `
    MATH 12 * 5 >> result
    PRINT result
  `;
  expectOutput(code, ["60"]);
});

runTest("MATH - Division", () => {
  const code = `
    MATH 100 / 4 >> result
    PRINT result
  `;
  expectOutput(code, ["25"]);
});

runTest("MATH - Modulo", () => {
  const code = `
    MATH 17 % 5 >> result
    PRINT result
  `;
  expectOutput(code, ["2"]);
});

runTest("MATH - Power", () => {
  const code = `
    MATH 2 ** 8 >> result
    PRINT result
  `;
  expectOutput(code, ["256"]);
});

runTest("MATH - Min", () => {
  const code = `
    MATH 100 min 59 >> result
    PRINT result
  `;
  expectOutput(code, ["59"]);
});

runTest("MATH - Max", () => {
  const code = `
    MATH 100 max 59 >> result
    PRINT result
  `;
  expectOutput(code, ["100"]);
});

runTest("MATH - Sqrt", () => {
  const code = `
    MATH 16 sqrt >> result
    PRINT result
  `;
  expectOutput(code, ["4"]);
});

runTest("MATH - Floor", () => {
  const code = `
    MATH 7.8 floor >> result
    PRINT result
  `;
  expectOutput(code, ["7"]);
});

runTest("MATH - Ceil", () => {
  const code = `
    MATH 7.2 ceil >> result
    PRINT result
  `;
  expectOutput(code, ["8"]);
});

runTest("MATH - Round", () => {
  const code = `
    MATH 7.5 round >> result
    PRINT result
  `;
  expectOutput(code, ["8"]);
});

runTest("MATH - Abs", () => {
  const code = `
    MATH -42 abs >> result
    PRINT result
  `;
  expectOutput(code, ["42"]);
});

runTest("MATH - Log (natural logarithm)", () => {
  const code = `
    MATH 2.718281828 log >> result
    PRINT result
  `;
  const vm = new PanSparkVM();
  const program = vm.run(vm.compile(code));
  while (program.next().done === false) {}
  const output = parseFloat(vm.buffer[0]);
  if (Math.abs(output - 1) > 0.001) {
    throw new Error(`Expected log(e) ≈ 1, got ${output}`);
  }
});

runTest("MATH - Division by zero throws error", () => {
  const code = `
    MATH 10 / 0 >> result
  `;
  expectError(code, /Division by zero/);
});

runTest("MATH - Complex expression", () => {
  const code = `
    MATH 2 + 3 * 4 >> result
    PRINT result
  `;
  expectOutput(code, ["14"]);
});

runTest("MATH - Expression with variables", () => {
  const code = `
    SET 5 >> a
    SET 3 >> b
    MATH a * 2 + b >> result
    PRINT result
  `;
  expectOutput(code, ["13"]);
});

// ==================== INCREMENT/DECREMENT ====================
console.log("\n=== INCREMENT/DECREMENT ===\n");

runTest("INC - Increment variable", () => {
  const code = `
    SET 10 >> counter
    INC counter
    PRINT counter
  `;
  expectOutput(code, ["11"]);
});

runTest("DEC - Decrement variable", () => {
  const code = `
    SET 10 >> counter
    DEC counter
    PRINT counter
  `;
  expectOutput(code, ["9"]);
});

runTest("INC - Multiple increments", () => {
  const code = `
    SET 0 >> counter
    INC counter
    INC counter
    INC counter
    PRINT counter
  `;
  expectOutput(code, ["3"]);
});

// ==================== CONTROL FLOW: JUMP/POINT ====================
console.log("\n=== CONTROL FLOW: JUMP/POINT ===\n");

runTest("JUMP - Unconditional jump", () => {
  const code = `
    ECHO "Start"
    JUMP end
    ECHO "This should be skipped"
    POINT end
    ECHO "End"
  `;
  expectOutput(code, ["Start", "End"]);
});

runTest("IF - Conditional jump (true condition)", () => {
  const code = `
    SET 10 >> x
    IF x > 5 >> greater
    ECHO "Not greater"
    JUMP done
    POINT greater
    ECHO "Greater"
    POINT done
  `;
  expectOutput(code, ["Greater"]);
});

runTest("IF - Conditional jump (false condition)", () => {
  const code = `
    SET 3 >> x
    IF x > 5 >> greater
    ECHO "Not greater"
    JUMP done
    POINT greater
    ECHO "Greater"
    POINT done
  `;
  expectOutput(code, ["Not greater"]);
});

runTest("IF - Equal comparison", () => {
  const code = `
    SET 42 >> x
    IF x == 42 >> match
    ECHO "No match"
    JUMP done
    POINT match
    ECHO "Match"
    POINT done
  `;
  expectOutput(code, ["Match"]);
});

runTest("IF - Not equal comparison", () => {
  const code = `
    SET 10 >> x
    SET 20 >> y
    IF x != y >> different
    ECHO "Same"
    JUMP done
    POINT different
    ECHO "Different"
    POINT done
  `;
  expectOutput(code, ["Different"]);
});

runTest("IF - Greater than or equal", () => {
  const code = `
    SET 20 >> a
    SET 20 >> b
    IF a >= b >> yes
    ECHO "No"
    JUMP done
    POINT yes
    ECHO "Yes"
    POINT done
  `;
  expectOutput(code, ["Yes"]);
});

runTest("IF - Less than or equal", () => {
  const code = `
    SET 15 >> a
    SET 20 >> b
    IF a <= b >> yes
    ECHO "No"
    JUMP done
    POINT yes
    ECHO "Yes"
    POINT done
  `;
  expectOutput(code, ["Yes"]);
});

// ==================== FOR LOOPS ====================
console.log("\n=== FOR LOOPS ===\n");

runTest("FOR - Basic loop", () => {
  const code = `
    FOR i 0 3
      PRINT i
    ENDFOR
  `;
  expectOutput(code, ["0", "1", "2", "3"]);
});

runTest("FOR - Loop with variable bounds", () => {
  const code = `
    SET 2 >> start
    SET 4 >> end
    FOR i start end
      PRINT i
    ENDFOR
  `;
  expectOutput(code, ["2", "3", "4"]);
});

runTest("FOR - Nested loops", () => {
  const code = `
    FOR i 0 1
      FOR j 0 1
        PRINT i
      ENDFOR
    ENDFOR
  `;
  expectOutput(code, ["0", "0", "1", "1"]);
});

runTest("BREAK - Exit loop early", () => {
  const code = `
    FOR i 0 5
      IF i == 2 >> break_point
      PRINT i
      JUMP continue_loop
      POINT break_point
      BREAK
      POINT continue_loop
    ENDFOR
    ECHO "Done"
  `;
  expectOutput(code, ["0", "1", "Done"]);
});

runTest("CONTINUE - Skip to next iteration", () => {
  const code = `
    FOR i 0 3
      IF i == 1 >> skip
      PRINT i
      JUMP next_iter
      POINT skip
      CONTINUE
      POINT next_iter
    ENDFOR
  `;
  expectOutput(code, ["0", "2", "3"]);
});

// ==================== PROCEDURES ====================
console.log("\n=== PROCEDURES ===\n");

runTest("PROC - Define and call simple procedure", () => {
  const code = `
    PROC greet ()
      ECHO "Hello"
      RETURN
    ENDPROC
    CALL greet () >> result
  `;
  expectOutput(code, ["Hello"]);
});

runTest("PROC - Procedure with return value", () => {
  const code = `
    PROC add (a, b)
      MATH a + b >> result
      RETURN result
    ENDPROC
    CALL add (5, 3) >> sum
    PRINT sum
  `;
  expectOutput(code, ["8"]);
});

runTest("PROC - Procedure with multiple parameters", () => {
  const code = `
    PROC max_two (a, b)
      IF a > b >> a_greater
      RETURN b
      POINT a_greater
      RETURN a
    ENDPROC
    CALL max_two (25, 17) >> result
    PRINT result
  `;
  expectOutput(code, ["25"]);
});

runTest("PROC - Nested procedure calls", () => {
  const code = `
    PROC add (a, b)
      MATH a + b >> result
      RETURN result
    ENDPROC
    PROC double_add (a, b)
      CALL add (a, b) >> sum
      MATH sum * 2 >> doubled
      RETURN doubled
    ENDPROC
    CALL double_add (3, 4) >> result
    PRINT result
  `;
  expectOutput(code, ["14"]);
});

runTest("PROC - Factorial (recursive)", () => {
  const code = `
    PROC factorial (n)
      IF n <= 1 >> base
      MATH n - 1 >> n_minus_1
      CALL factorial (n_minus_1) >> prev_fact
      MATH n * prev_fact >> result
      RETURN result
      POINT base
      RETURN 1
    ENDPROC
    CALL factorial (5) >> result
    PRINT result
  `;
  expectOutput(code, ["120"]);
});

runTest("PROC - Fibonacci sequence", () => {
  const code = `
    PROC fibonacci (n)
      IF n <= 1 >> return_n
      MATH n - 1 >> n_minus_1
      CALL fibonacci (n_minus_1) >> fib1
      MATH n - 2 >> n_minus_2
      CALL fibonacci (n_minus_2) >> fib2
      MATH fib1 + fib2 >> result
      RETURN result
      POINT return_n
      RETURN n
    ENDPROC
    CALL fibonacci (3) >> result
    PRINT result
  `;
  expectOutput(code, ["2"]);
});

runTest("PROC - Local variable scope", () => {
  const code = `
    SET 100 >> global_var
    PROC modify_var ()
      SET 42 >> global_var
      RETURN global_var
    ENDPROC
    CALL modify_var () >> result
    PRINT global_var
    PRINT result
  `;
  expectOutput(code, ["100", "42"]);
});

// ==================== LIST OPERATIONS ====================
console.log("\n=== LIST OPERATIONS ===\n");

runTest("LIST_CREATE - Create empty list", () => {
  const code = `
    LIST_CREATE mylist
    ECHO "List created"
  `;
  expectOutput(code, ["List created"]);
});

runTest("LIST_PUSH - Add elements to list", () => {
  const code = `
    LIST_CREATE numbers
    LIST_PUSH 10 >> numbers
    LIST_PUSH 20 >> numbers
    LIST_PUSH 30 >> numbers
    ECHO "Elements added"
  `;
  expectOutput(code, ["Elements added"]);
});

runTest("LIST_GET - Retrieve element from list", () => {
  const code = `
    LIST_CREATE numbers
    LIST_PUSH 10 >> numbers
    LIST_PUSH 20 >> numbers
    LIST_PUSH 30 >> numbers
    LIST_GET numbers 1 >> second
    PRINT second
  `;
  expectOutput(code, ["20"]);
});

runTest("LIST_SET - Modify element at index", () => {
  const code = `
    LIST_CREATE numbers
    LIST_PUSH 10 >> numbers
    LIST_PUSH 20 >> numbers
    LIST_PUSH 30 >> numbers
    LIST_SET 999 1 >> numbers
    LIST_GET numbers 1 >> value
    PRINT value
  `;
  expectOutput(code, ["999"]);
});

runTest("LIST_SORT - Sort ascending", () => {
  const code = `
    LIST_CREATE numbers
    LIST_PUSH 50 >> numbers
    LIST_PUSH 10 >> numbers
    LIST_PUSH 30 >> numbers
    LIST_SORT numbers min
    LIST_GET numbers 0 >> first
    LIST_GET numbers 1 >> second
    LIST_GET numbers 2 >> third
    PRINT first
    PRINT second
    PRINT third
  `;
  expectOutput(code, ["10", "30", "50"]);
});

runTest("LIST_SORT - Sort descending", () => {
  const code = `
    LIST_CREATE numbers
    LIST_PUSH 50 >> numbers
    LIST_PUSH 10 >> numbers
    LIST_PUSH 30 >> numbers
    LIST_SORT numbers max
    LIST_GET numbers 0 >> first
    LIST_GET numbers 1 >> second
    LIST_GET numbers 2 >> third
    PRINT first
    PRINT second
    PRINT third
  `;
  expectOutput(code, ["50", "30", "10"]);
});

runTest("LIST_GET - Out of bounds throws error", () => {
  const code = `
    LIST_CREATE numbers
    LIST_PUSH 10 >> numbers
    LIST_GET numbers 5 >> value
  `;
  expectError(code, /out of bounds/i);
});

runTest("LIST_SET - Out of bounds throws error", () => {
  const code = `
    LIST_CREATE numbers
    LIST_PUSH 10 >> numbers
    LIST_SET 99 5 >> numbers
  `;
  expectError(code, /out of bounds/i);
});

// ==================== MEMORY OPERATIONS ====================
console.log("\n=== MEMORY OPERATIONS ===\n");

runTest("FREE - Remove variable from memory", () => {
  const code = `
    SET 42 >> temp
    PRINT temp
    FREE temp
    ECHO "Variable freed"
  `;
  expectOutput(code, ["42", "Variable freed"]);
});

runTest("FREE - Cannot use freed variable", () => {
  const code = `
    SET 42 >> temp
    FREE temp
    PRINT temp
  `;
  expectError(code, /undefined|not found|not defined/i);
});

runTest("MEMDUMP - Display memory state", () => {
  const code = `
    SET 10 >> x
    SET 20 >> y
    MEMDUMP
  `;
  expectOutputContains(code, "DUMPING MEMORY");
  expectOutputContains(code, "x");
  expectOutputContains(code, "y");
});

runTest("TICK - Get instruction counter", () => {
  const code = `
    SET 10 >> x
    TICK counter
    PRINT counter
  `;
  const vm = new PanSparkVM();
  const program = vm.run(vm.compile(code));
  while (program.next().done === false) {}
  const tick = parseInt(vm.buffer[0]);
  if (tick <= 0) {
    throw new Error(`Expected positive tick count, got ${tick}`);
  }
});

runTest("NOP - No operation", () => {
  const code = `
    ECHO "Before"
    NOP
    NOP
    ECHO "After"
  `;
  expectOutput(code, ["Before", "After"]);
});

// ==================== WAIT OPERATIONS ====================
console.log("\n=== WAIT OPERATIONS ===\n");

undefined

// ==================== EDGE CASES & ERROR HANDLING ====================
console.log("\n=== EDGE CASES & ERROR HANDLING ===\n");

runTest("Undefined variable throws error", () => {
  const code = `
    PRINT undefined_var
  `;
  expectError(code, /undefined|not found/i);
});

runTest("Invalid jump target throws error", () => {
  const code = `
    JUMP nonexistent_point
  `;
  expectError(code, /not found/i);
});

runTest("Recursion depth limit enforced", () => {
  const code = `
    PROC recurse (n)
      MATH n + 1 >> n
      CALL recurse (n) >> result
      RETURN result
    ENDPROC
    CALL recurse (0) >> result
  `;
  expectError(code, /recursion|depth/i);
});

runTest("Procedure without return defaults to 0", () => {
  const code = `
    PROC no_return ()
      ECHO "Doing something"
    ENDPROC
    CALL no_return () >> result
    PRINT result
  `;
  expectOutput(code, ["Doing something", "0"]);
});

runTest("END - Terminate program", () => {
  const code = `
    ECHO "Start"
    END
    ECHO "This should not print"
  `;
  expectOutput(code, ["Start"]);
});

// ==================== RESULTS SUMMARY ====================
console.log("\n" + "=".repeat(50));
console.log("TEST RESULTS SUMMARY");
console.log("=".repeat(50) + "\n");

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
const total = results.length;

console.log(`Total: ${total}`);
console.log(`Passed: ${passed} ✓`);
console.log(`Failed: ${failed} ✗`);
console.log(`Pass Rate: ${((passed / total) * 100).toFixed(2)}%`);

if (failed > 0) {
  console.log("\nFailed Tests:");
  results.filter((r) => !r.passed).forEach((r) => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log("\n🎉 All tests passed!");
  process.exit(0);
}
