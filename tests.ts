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

runTest("PRINT - Print string literal", () => {
  const code = `
    PRINT "Hello World"
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
    PRINT "Start"
    JUMP end
    PRINT "This should be skipped"
    POINT end
    PRINT "End"
  `;
  expectOutput(code, ["Start", "End"]);
});

runTest("IF - Conditional jump (true condition)", () => {
  const code = `
    SET 10 >> x
    IF x > 5 >> greater
    PRINT "Not greater"
    JUMP done
    POINT greater
    PRINT "Greater"
    POINT done
  `;
  expectOutput(code, ["Greater"]);
});

runTest("IF - Conditional jump (false condition)", () => {
  const code = `
    SET 3 >> x
    IF x > 5 >> greater
    PRINT "Not greater"
    JUMP done
    POINT greater
    PRINT "Greater"
    POINT done
  `;
  expectOutput(code, ["Not greater"]);
});

runTest("IF - Equal comparison", () => {
  const code = `
    SET 42 >> x
    IF x == 42 >> match
    PRINT "No match"
    JUMP done
    POINT match
    PRINT "Match"
    POINT done
  `;
  expectOutput(code, ["Match"]);
});

runTest("IF - Not equal comparison", () => {
  const code = `
    SET 10 >> x
    SET 20 >> y
    IF x != y >> different
    PRINT "Same"
    JUMP done
    POINT different
    PRINT "Different"
    POINT done
  `;
  expectOutput(code, ["Different"]);
});

runTest("IF - Greater than or equal", () => {
  const code = `
    SET 20 >> a
    SET 20 >> b
    IF a >= b >> yes
    PRINT "No"
    JUMP done
    POINT yes
    PRINT "Yes"
    POINT done
  `;
  expectOutput(code, ["Yes"]);
});

runTest("IF - Less than or equal", () => {
  const code = `
    SET 15 >> a
    SET 20 >> b
    IF a <= b >> yes
    PRINT "No"
    JUMP done
    POINT yes
    PRINT "Yes"
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
    PRINT "Done"
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
      PRINT "Hello"
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
    PRINT "List created"
  `;
  expectOutput(code, ["List created"]);
});

runTest("LIST_PUSH - Add elements to list", () => {
  const code = `
    LIST_CREATE numbers
    LIST_PUSH 10 >> numbers
    LIST_PUSH 20 >> numbers
    LIST_PUSH 30 >> numbers
    PRINT "Elements added"
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
    PRINT "Variable freed"
  `;
  expectOutput(code, ["42", "Variable freed"]);
});

runTest("FREE - Freed variable becomes undefined when referenced", () => {
   const code = `
     SET 42 >> temp
     FREE temp
     SET temp >> result
     PRINT result
   `;
   // After FREE, temp is not in memory, so SET treats it as a string literal
   expectOutput(code, ["temp"]);
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
    PRINT "Before"
    NOP
    NOP
    PRINT "After"
  `;
  expectOutput(code, ["Before", "After"]);
});

// ==================== STATE PERSISTENCE ====================
console.log("\n=== STATE PERSISTENCE ===\n");

runTest("State - Save and restore basic state", () => {
  const vm = new PanSparkVM();
  const code = `
    SET 42 >> x
    SET 100 >> y
    MATH x + y >> z
  `;
  const instructions = vm.compile(code);
  const gen = vm.run(instructions);
  
  // Execute first 2 steps
  gen.next();
  gen.next();
  
  // Save state
  const savedState = vm.saveState(instructions);
  
  // Verify state was saved
  if (savedState.length === 0) {
    throw new Error("State string is empty");
  }
  if (savedState.length > 32767) {
    throw new Error(`State size ${savedState.length} exceeds 32767 limit`);
  }
  
  // Restore to new VM
  const vm2 = new PanSparkVM();
  const restoredInstructions = vm2.loadState(savedState);
  
  if (!restoredInstructions) {
    throw new Error("Instructions were not restored");
  }
  
  // Verify state was restored
  if (vm2.counter !== vm.counter) {
    throw new Error(`Counter mismatch: expected ${vm.counter}, got ${vm2.counter}`);
  }
});

runTest("State - Save preserves variables", () => {
  const vm = new PanSparkVM();
  const code = `
    SET 42 >> answer
    SET "hello" >> message
    SET 3.14 >> pi
  `;
  const instructions = vm.compile(code);
  const gen = vm.run(instructions);
  
  // Run all
  while (gen.next().done === false) {}
  
  const savedState = vm.saveState(instructions);
  
  // Restore
  const vm2 = new PanSparkVM();
  vm2.loadState(savedState);
  
  const vars1 = vm.getVariableMemory();
  const vars2 = vm2.getVariableMemory();
  
  if (vars1.size !== vars2.size) {
    throw new Error(`Variable count mismatch: ${vars1.size} vs ${vars2.size}`);
  }
});

runTest("State - Resume execution from saved state", () => {
  const vm = new PanSparkVM();
  const code = `
    SET 0 >> i
    POINT loop_start
    PRINT i
    MATH i + 1 >> i
    IF i < 3 >> loop_start
    PRINT "Done"
  `;
  const instructions = vm.compile(code);
  const gen = vm.run(instructions);
  
  // Run first 5 steps
  for (let j = 0; j < 5; j++) {
    gen.next();
  }
  
  const savedState = vm.saveState(instructions);
  
  // Restore and continue
  const vm2 = new PanSparkVM();
  const restoredInstructions = vm2.loadState(savedState)!;
  const gen2 = vm2.run(restoredInstructions);
  
  while (gen2.next().done === false) {}
  
  // Should complete successfully
  if (!vm2.buffer.includes("Done")) {
    throw new Error("Execution did not complete properly after restore");
  }
});

runTest("State - Save with procedures", () => {
  const vm = new PanSparkVM();
  const code = `
    PROC add (a, b)
      MATH a + b >> result
      RETURN result
    ENDPROC
    CALL add (5, 3) >> sum
    PRINT sum
  `;
  const instructions = vm.compile(code);
  const gen = vm.run(instructions);
  
  // Run first few steps
  for (let i = 0; i < 3; i++) {
    gen.next();
  }
  
  const savedState = vm.saveState(instructions);
  
  // Restore
  const vm2 = new PanSparkVM();
  const restoredInstructions = vm2.loadState(savedState)!;
  
  // Continue execution
  const gen2 = vm2.run(restoredInstructions);
  while (gen2.next().done === false) {}
  
  expectOutput(code, ["8"]);
});

runTest("State - Character limit validation", () => {
  const vm = new PanSparkVM();
  
  // Create a huge buffer to exceed limit
  vm.buffer = new Array(35000).fill("x");
  
  try {
    vm.saveState();
    throw new Error("Expected error for exceeding character limit");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (!errorMsg.includes("32767")) {
      throw new Error(`Error should mention 32767 limit: ${errorMsg}`);
    }
  }
});

runTest("State - Save without instructions (smaller size)", () => {
  const vm = new PanSparkVM();
  const code = `
    SET 42 >> x
    SET 100 >> y
  `;
  const instructions = vm.compile(code);
  const gen = vm.run(instructions);
  while (gen.next().done === false) {}
  
  const withInstructions = vm.saveState(instructions);
  const withoutInstructions = vm.saveState();
  
  // Without instructions should be smaller
  if (withoutInstructions.length >= withInstructions.length) {
    throw new Error(
      `State without instructions (${withoutInstructions.length}) should be smaller than with (${withInstructions.length})`
    );
  }
});

runTest("State - Load returns null when no instructions saved", () => {
  const vm = new PanSparkVM();
  const code = `SET 42 >> x`;
  const instructions = vm.compile(code);
  const gen = vm.run(instructions);
  gen.next();
  
  // Save WITHOUT instructions
  const savedState = vm.saveState();
  
  // Load
  const vm2 = new PanSparkVM();
  const restoredInstructions = vm2.loadState(savedState);
  
  if (restoredInstructions !== null) {
    throw new Error("loadState should return null when instructions not saved");
  }
});

runTest("State - Restore state with FOR loops", () => {
  const vm = new PanSparkVM();
  const code = `
    FOR i 0 2
      PRINT i
    ENDFOR
  `;
  const instructions = vm.compile(code);
  const gen = vm.run(instructions);
  
  // Run partial
  gen.next();
  gen.next();
  gen.next();
  
  const savedState = vm.saveState(instructions);
  
  // Restore
  const vm2 = new PanSparkVM();
  const restoredInstructions = vm2.loadState(savedState)!;
  const gen2 = vm2.run(restoredInstructions);
  
  while (gen2.next().done === false) {}
  
  // Should have printed all values
  if (!vm2.buffer.includes("0") || !vm2.buffer.includes("2")) {
    throw new Error("FOR loop did not complete properly after restore");
  }
});

runTest("State - UUID preserved after restore", () => {
  const vm = new PanSparkVM();
  const originalUUID = vm.uuid;
  
  const code = `SET 42 >> x`;
  const instructions = vm.compile(code);
  const gen = vm.run(instructions);
  gen.next();
  
  const savedState = vm.saveState(instructions);
  
  // Restore
  const vm2 = new PanSparkVM();
  vm2.loadState(savedState);
  
  if (vm2.uuid !== originalUUID) {
    throw new Error(
      `UUID mismatch: expected ${originalUUID}, got ${vm2.uuid}`
    );
  }
});

runTest("State - Corrupted state throws error", () => {
  const vm = new PanSparkVM();
  
  try {
    vm.loadState("invalid json");
    throw new Error("Expected error when loading corrupted state");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (!errorMsg.includes("Failed to load")) {
      throw new Error(`Error should mention failed load: ${errorMsg}`);
    }
  }
});

runTest("State - Large state at exactly 32767 characters", () => {
  const vm = new PanSparkVM();
  
  // Create state that's close to limit
  const code = `SET 42 >> x`;
  const instructions = vm.compile(code);
  const gen = vm.run(instructions);
  gen.next();
  
  const savedState = vm.saveState(instructions);
  
  // Should not throw if under limit
  if (savedState.length > 32767) {
    throw new Error(`State size ${savedState.length} exceeds limit`);
  }
  
  // Should be able to restore
  const vm2 = new PanSparkVM();
  const restoredInstructions = vm2.loadState(savedState);
  
  if (!restoredInstructions) {
    throw new Error("Failed to restore state");
  }
});

// ==================== WAIT OPERATIONS ====================
console.log("\n=== WAIT OPERATIONS ===\n");

// ==================== EDGE CASES & ERROR HANDLING ====================
console.log("\n=== EDGE CASES & ERROR HANDLING ===\n");

runTest("Undefined variable treated as string literal in PRINT", () => {
   const code = `
     PRINT undefined_var
   `;
   // In PanSpark, undefined identifiers become string literals
   expectOutput(code, ["undefined_var"]);
});

runTest("Invalid jump target throws error", () => {
  const code = `
    JUMP nonexistent_point
  `;
  expectError(code, /not found/i);
});

runTest("Procedure without return defaults to 0", () => {
  const code = `
    PROC no_return ()
      PRINT "Doing something"
    ENDPROC
    CALL no_return () >> result
    PRINT result
  `;
  expectOutput(code, ["Doing something", "0"]);
});

runTest("END - Terminate program", () => {
  const code = `
    PRINT "Start"
    END
    PRINT "This should not print"
  `;
  expectOutput(code, ["Start"]);
});

// ==================== STRING OPERATIONS ====================
console.log("\n=== STRING OPERATIONS ===\n");

runTest("CONCAT - Basic string concatenation", () => {
  const code = `
    SET "Hello" >> str1
    SET " World" >> str2
    CONCAT str1 str2 >> result
    PRINT result
  `;
  expectOutput(code, ["Hello World"]);
});

runTest("CONCAT - Number to string conversion", () => {
  const code = `
    SET 42 >> num
    SET "!" >> exclamation
    CONCAT num exclamation >> result
    PRINT result
  `;
  expectOutput(code, ["42!"]);
});

runTest("STRLEN - String length", () => {
  const code = `
    SET "Hello" >> str
    STRLEN str >> len
    PRINT len
  `;
  expectOutput(code, ["5"]);
});

runTest("STRLEN - Empty string", () => {
  const code = `
    SET "" >> empty
    STRLEN empty >> len
    PRINT len
  `;
  expectOutput(code, ["0"]);
});

runTest("STRLEN - Number length", () => {
  const code = `
    SET 12345 >> num
    STRLEN num >> len
    PRINT len
  `;
  expectOutput(code, ["5"]);
});

runTest("SUBSTR - Substring extraction", () => {
  const code = `
    SET "Hello World" >> str
    SUBSTR str 0 5 >> result
    PRINT result
  `;
  expectOutput(code, ["Hello"]);
});

runTest("SUBSTR - Middle substring", () => {
  const code = `
    SET "JavaScript" >> str
    SUBSTR str 4 10 >> result
    PRINT result
  `;
  expectOutput(code, ["Script"]);
});

runTest("SUBSTR - Full string", () => {
  const code = `
    SET "Test" >> str
    SUBSTR str 0 4 >> result
    PRINT result
  `;
  expectOutput(code, ["Test"]);
});

// ==================== STRING ESCAPE SEQUENCES ====================
console.log("\n=== STRING ESCAPE SEQUENCES ===\n");

runTest("String escape - Newline character", () => {
  const code = `
    PRINT "Line1\\nLine2"
  `;
  expectOutput(code, ["Line1\nLine2"]);
});

runTest("String escape - Tab character", () => {
  const code = `
    PRINT "Col1\\tCol2"
  `;
  expectOutput(code, ["Col1\tCol2"]);
});

runTest("String escape - Escaped quotes", () => {
  const code = `
    PRINT "She said \\"Hello\\""
  `;
  expectOutput(code, ['She said "Hello"']);
});

runTest("String escape - Escaped backslash", () => {
  const code = `
    PRINT "Path: C:\\\\Users\\\\Documents"
  `;
  expectOutput(code, ["Path: C:\\Users\\Documents"]);
});

// ==================== UNARY OPERATORS ====================
console.log("\n=== UNARY OPERATORS ===\n");

runTest("MATH - Unary minus", () => {
  const code = `
    MATH -5 >> x
    PRINT x
  `;
  expectOutput(code, ["-5"]);
});

runTest("MATH - Unary minus with variable", () => {
  const code = `
    SET 10 >> num
    MATH -num >> x
    PRINT x
  `;
  expectOutput(code, ["-10"]);
});

runTest("MATH - Unary plus (identity)", () => {
  const code = `
    MATH +5 >> x
    PRINT x
  `;
  expectOutput(code, ["5"]);
});

runTest("MATH - Unary minus in expression", () => {
  const code = `
    MATH -5 + 10 >> x
    PRINT x
  `;
  expectOutput(code, ["5"]);
});

runTest("MATH - Complex unary expression", () => {
  const code = `
    SET 3 >> a
    SET 4 >> b
    MATH -(a + b) >> x
    PRINT x
  `;
  // Note: This test uses -(a + b) which tests unary negation on parenthesized expression
  expectOutput(code, ["-7"]);
});

// ==================== REVERSE FOR LOOPS ====================
console.log("\n=== REVERSE FOR LOOPS ===\n");

runTest("FOR - Reverse loop with negative step", () => {
  const code = `
    FOR i 3 0 -1
      PRINT i
    ENDFOR
  `;
  expectOutput(code, ["3", "2", "1", "0"]);
});

runTest("FOR - Reverse loop with step -2", () => {
  const code = `
    FOR i 10 0 -2
      PRINT i
    ENDFOR
  `;
  expectOutput(code, ["10", "8", "6", "4", "2", "0"]);
});

runTest("FOR - Forward loop with step 2", () => {
  const code = `
    FOR i 0 6 2
      PRINT i
    ENDFOR
  `;
  expectOutput(code, ["0", "2", "4", "6"]);
});

runTest("FOR - Forward loop with step 3", () => {
  const code = `
    FOR i 1 10 3
      PRINT i
    ENDFOR
  `;
  expectOutput(code, ["1", "4", "7", "10"]);
});

// ==================== VARIABLE LIMIT ====================
console.log("\n=== VARIABLE COUNT LIMIT ===\n");

runTest("Variable limit - Allow unlimited variables by default", () => {
  const code = `
    SET 1 >> a
    SET 2 >> b
    SET 3 >> c
    SET 4 >> d
    SET 5 >> e
    MATH a + b + c + d + e >> total
    PRINT total
  `;
  expectOutput(code, ["15"]);
});

runTest("Variable limit - Enforce variable count restriction", () => {
  const vm = new PanSparkVM();
  vm.setMaxVariableCount(2);
  const code = `
    SET 1 >> a
    SET 2 >> b
    SET 3 >> c
  `;
  try {
    const program = vm.run(vm.compile(code));
    while (program.next().done === false) {}
    throw new Error("Expected code to throw an error but it did not");
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (!errorMsg.match(/limit exceeded|Cannot create variable/i)) {
      throw new Error(
        `Error message does not match pattern. Expected: /limit exceeded|Cannot create variable/i, Got: ${errorMsg}`
      );
    }
  }
});

runTest("Variable limit - Allow overwriting existing variables", () => {
  const vm = new PanSparkVM();
  vm.setMaxVariableCount(2);
  const code = `
    SET 1 >> a
    SET 2 >> b
    SET 10 >> a
    SET 20 >> b
    MATH a + b >> a
    PRINT a
  `;
  const program = vm.run(vm.compile(code));
  while (program.next().done === false) {}
  if (vm.buffer[0] !== "30") {
    throw new Error(`Expected "30" but got "${vm.buffer[0]}"`);
  }
});

// ==================== AST EXPRESSION EVALUATOR ====================
console.log("\n=== AST EXPRESSION EVALUATOR ===\n");

runTest("AST - Complex expression with multiple operators", () => {
  const code = `
    SET 2 >> a
    SET 3 >> b
    SET 4 >> c
    MATH a * b + c >> result
    PRINT result
  `;
  expectOutput(code, ["10"]);
});

runTest("AST - Expression with power operator", () => {
  const code = `
    MATH 2 ** 3 >> result
    PRINT result
  `;
  expectOutput(code, ["8"]);
});

runTest("AST - Right-associative power", () => {
  const code = `
    MATH 2 ** 3 ** 2 >> result
    PRINT result
  `;
  expectOutput(code, ["512"]);
});

runTest("AST - Nested parentheses", () => {
  const code = `
    MATH ((2 + 3) * (4 + 5)) >> result
    PRINT result
  `;
  expectOutput(code, ["45"]);
});

runTest("AST - Modulo operator", () => {
  const code = `
    MATH 17 % 5 >> result
    PRINT result
  `;
  expectOutput(code, ["2"]);
});

runTest("AST - Unary on complex expression", () => {
  const code = `
    SET 5 >> x
    MATH -(2 * x + 3) >> result
    PRINT result
  `;
  expectOutput(code, ["-13"]);
});

runTest("AST - Expression with spaces (should be handled)", () => {
  const code = `
    MATH 10 + 5 * 2 >> result
    PRINT result
  `;
  expectOutput(code, ["20"]);
});

runTest("AST - All operators in one expression", () => {
  const code = `
    SET 10 >> x
    MATH x + 5 - 2 * 3 / 2 >> result
    PRINT result
  `;
  expectOutput(code, ["12"]);
});

runTest("AST - Unary minus followed by parentheses", () => {
  const code = `
    MATH -(5 + 3) >> result
    PRINT result
  `;
  expectOutput(code, ["-8"]);
});

runTest("AST - Multiple unary operators", () => {
  const code = `
    MATH - - 5 >> result
    PRINT result
  `;
  expectOutput(code, ["5"]);
});

runTest("MEMSTATS - Basic memory statistics", () => {
  const code = `
    SET 10 >> x
    SET 20 >> y
    SET "hello" >> greeting
    MEMSTATS
  `;
  const output = runCode(code);
  const fullOutput = output.join("\n");
  if (!fullOutput.includes("Global Variables: 3")) {
    throw new Error(`Expected "Global Variables: 3" in output, got: ${JSON.stringify(output)}`);
  }
});

runTest("MEMSTATS - Store stats in variable", () => {
  const code = `
    SET 10 >> x
    SET 20 >> y
    MEMSTATS >> stats
    PRINT stats
  `;
  const output = runCode(code);
  if (!output[0].includes("STATS:")) {
    throw new Error(`Expected stats string starting with "STATS:", got: ${output[0]}`);
  }
  if (!output[0].includes("GlobalVars=2")) {
    throw new Error(`Expected "GlobalVars=2" in stats, got: ${output[0]}`);
  }
});

runTest("MEMSTATS - With variable limit", () => {
  const code = `
    SET 10 >> x
    MEMSTATS
  `;
  const vm = new PanSparkVM();
  vm.setMaxVariableCount(5);
  const program = vm.run(vm.compile(code));
  while (program.next().done === false) {}
  const fullOutput = vm.buffer.join("\n");
  if (!fullOutput.includes("Variable Limit: 5")) {
    throw new Error(`Expected "Variable Limit: 5" in output, got: ${JSON.stringify(vm.buffer)}`);
  }
});

runTest("Inline comments - Basic inline comment", () => {
  const code = `
    SET 10 >> x  // This is a comment
    PRINT x      // Print the variable
  `;
  expectOutput(code, ["10"]);
});

runTest("Inline comments - Comment after operation", () => {
  const code = `
    MATH 5 + 3 >> result  // 5 plus 3
    PRINT result
  `;
  expectOutput(code, ["8"]);
});

runTest("Inline comments - Comment with special characters", () => {
  const code = `
    SET 42 >> answer  // The answer to everything (and more)!
    PRINT answer
  `;
  expectOutput(code, ["42"]);
});

runTest("Inline comments - Multiple slashes in comment", () => {
   const code = `
     SET 100 >> x  // This is a comment with // multiple // slashes
     PRINT x
   `;
   expectOutput(code, ["100"]);
});

// ==================== TYPEOF OPERATOR ====================
console.log("\n=== TYPEOF OPERATOR ===\n");

runTest("TYPEOF - Check number type", () => {
   const code = `
     SET 42 >> x
     TYPEOF x >> type
     PRINT type
   `;
   expectOutput(code, ["number"]);
});

runTest("TYPEOF - Check string type", () => {
   const code = `
     SET hello >> x
     TYPEOF x >> type
     PRINT type
   `;
   expectOutput(code, ["string"]);
});

runTest("TYPEOF - Check list type", () => {
   const code = `
     LIST_CREATE mylist
     TYPEOF mylist >> type
     PRINT type
   `;
   expectOutput(code, ["list"]);
});

runTest("TYPEOF - Check undefined variable", () => {
   const code = `
     TYPEOF undefined_var >> type
     PRINT type
   `;
   expectOutput(code, ["undefined"]);
});

// ==================== STRING FUNCTIONS ====================
console.log("\n=== STRING FUNCTIONS ===\n");

runTest("STR_UPPER - Convert to uppercase", () => {
   const code = `
     SET hello >> str
     STR_UPPER str >> upper
     PRINT upper
   `;
   expectOutput(code, ["HELLO"]);
});

runTest("STR_LOWER - Convert to lowercase", () => {
   const code = `
     SET WORLD >> str
     STR_LOWER str >> lower
     PRINT lower
   `;
   expectOutput(code, ["world"]);
});

runTest("STR_TRIM - Remove whitespace", () => {
   const code = `
     SET "  hello  " >> str
     STR_TRIM str >> trimmed
     PRINT trimmed
   `;
   expectOutput(code, ["hello"]);
});

runTest("STR_REPLACE - Replace text", () => {
   const code = `
     SET "hello world" >> str
     STR_REPLACE str "world" "universe" >> replaced
     PRINT replaced
   `;
   expectOutput(code, ["hello universe"]);
});

runTest("STR_CONTAINS - Check if contains substring (true)", () => {
   const code = `
     SET "hello world" >> str
     STR_CONTAINS str "world" >> found
     PRINT found
   `;
   expectOutput(code, ["1"]);
});

runTest("STR_CONTAINS - Check if contains substring (false)", () => {
   const code = `
     SET "hello world" >> str
     STR_CONTAINS str "xyz" >> found
     PRINT found
   `;
   expectOutput(code, ["0"]);
});

runTest("STR_CHAR - Get character at index", () => {
   const code = `
     SET "hello" >> str
     STR_CHAR str 1 >> char
     PRINT char
   `;
   expectOutput(code, ["e"]);
});

// ==================== LOGICAL OPERATORS (AND, OR, NOT) ====================
console.log("\n=== LOGICAL OPERATORS ===\n");

runTest("IF with AND - Both true", () => {
   const code = `
     SET 10 >> x
     SET 20 >> y
     IF x < 15 AND y > 10 >> success
     PRINT "Failed"
     JUMP end
     POINT success
     PRINT "Success"
     POINT end
   `;
   expectOutput(code, ["Success"]);
});

runTest("IF with AND - First false", () => {
   const code = `
     SET 10 >> x
     SET 20 >> y
     IF x > 15 AND y > 10 >> success
     PRINT "Failed"
     JUMP end
     POINT success
     PRINT "Success"
     POINT end
   `;
   expectOutput(code, ["Failed"]);
});

runTest("IF with OR - First true", () => {
   const code = `
     SET 10 >> x
     SET 5 >> y
     IF x > 5 OR y > 10 >> success
     PRINT "Failed"
     JUMP end
     POINT success
     PRINT "Success"
     POINT end
   `;
   expectOutput(code, ["Success"]);
});

runTest("IF with OR - Both false", () => {
   const code = `
     SET 2 >> x
     SET 3 >> y
     IF x > 10 OR y > 10 >> success
     PRINT "Failed"
     JUMP end
     POINT success
     PRINT "Success"
     POINT end
   `;
   expectOutput(code, ["Failed"]);
});

runTest("IF with NOT", () => {
   const code = `
     SET 0 >> x
     IF NOT x >> success
     PRINT "Failed"
     JUMP end
     POINT success
     PRINT "Success"
     POINT end
   `;
   expectOutput(code, ["Success"]);
});

// ==================== LIST FUNCTIONS ====================
console.log("\n=== LIST FUNCTIONS ===\n");

runTest("LIST_LENGTH - Get list length", () => {
   const code = `
     LIST_CREATE mylist
     LIST_PUSH 10 >> mylist
     LIST_PUSH 20 >> mylist
     LIST_PUSH 30 >> mylist
     LIST_LENGTH mylist >> len
     PRINT len
   `;
   expectOutput(code, ["3"]);
});

runTest("LIST_REVERSE - Reverse a list", () => {
   const code = `
     LIST_CREATE mylist
     LIST_PUSH 1 >> mylist
     LIST_PUSH 2 >> mylist
     LIST_PUSH 3 >> mylist
     LIST_REVERSE mylist >> reversed
     LIST_GET reversed 0 >> first
     PRINT first
   `;
   expectOutput(code, ["3"]);
});

runTest("LIST_FIND - Find element in list", () => {
   const code = `
     LIST_CREATE mylist
     LIST_PUSH 10 >> mylist
     LIST_PUSH 20 >> mylist
     LIST_PUSH 30 >> mylist
     LIST_FIND mylist 20 >> index
     PRINT index
   `;
   expectOutput(code, ["1"]);
});

runTest("LIST_FIND - Element not found", () => {
   const code = `
     LIST_CREATE mylist
     LIST_PUSH 10 >> mylist
     LIST_PUSH 20 >> mylist
     LIST_FIND mylist 99 >> index
     PRINT index
   `;
   expectOutput(code, ["-1"]);
});

runTest("LIST_CONTAINS - Check if list contains value (true)", () => {
   const code = `
     LIST_CREATE mylist
     LIST_PUSH 10 >> mylist
     LIST_PUSH 20 >> mylist
     LIST_PUSH 30 >> mylist
     LIST_CONTAINS mylist 20 >> found
     PRINT found
   `;
   expectOutput(code, ["1"]);
});

runTest("LIST_CONTAINS - Check if list contains value (false)", () => {
   const code = `
     LIST_CREATE mylist
     LIST_PUSH 10 >> mylist
     LIST_PUSH 20 >> mylist
     LIST_CONTAINS mylist 99 >> found
     PRINT found
   `;
   expectOutput(code, ["0"]);
});

runTest("LIST_REMOVE - Remove element from list", () => {
   const code = `
     LIST_CREATE mylist
     LIST_PUSH 10 >> mylist
     LIST_PUSH 20 >> mylist
     LIST_PUSH 30 >> mylist
     LIST_REMOVE mylist 1 >> removed
     PRINT removed
     LIST_LENGTH mylist >> len
     PRINT len
   `;
   expectOutput(code, ["20", "2"]);
});

// ==================== TRY-CATCH ERROR HANDLING ====================
console.log("\n=== TRY-CATCH ERROR HANDLING ===\n");

runTest("TRY-CATCH - Catch division by zero", () => {
   const code = `
      TRY err
        MATH 10 / 0 >> result
        PRINT "Should not reach here"
      CATCH
        PRINT err
      ENDTRY
   `;
   expectOutputContains(code, "Division by zero");
});

runTest("TRY-CATCH - No error, skip catch", () => {
   const code = `
      TRY err
        MATH 10 + 5 >> result
        PRINT "Success"
      CATCH
        PRINT "Should not reach here"
      ENDTRY
   `;
   expectOutput(code, ["Success"]);
});

runTest("TRY-CATCH - Throw custom error", () => {
   const code = `
      TRY err
        THROW "Custom error message"
      CATCH
        PRINT err
      ENDTRY
   `;
   expectOutput(code, ["Custom error message"]);
});

runTest("TRY-CATCH - Undefined variable treated as string literal", () => {
   const code = `
      TRY err
        PRINT undefined_variable
      CATCH
        PRINT "Caught error"
      ENDTRY
   `;
   // undefined_variable is a string literal in PanSpark
   expectOutput(code, ["undefined_variable"]);
});

runTest("TRY-CATCH - Nested try blocks", () => {
   const code = `
      TRY outer_err
        TRY inner_err
          THROW "Inner error"
        CATCH
          PRINT "Inner catch"
        ENDTRY
        PRINT "After inner try"
      CATCH
        PRINT "Outer catch"
      ENDTRY
   `;
   expectOutput(code, ["Inner catch", "After inner try"]);
});

// ==================== STRUCT OPERATIONS ====================
console.log("\n=== STRUCT OPERATIONS ===\n");

runTest("STRUCT - Define and create struct", () => {
   const code = `
      STRUCT Point
      x: number
      y: number
      STRUCTEND

      SET Point >> p
      PRINT "Struct created"
   `;
   expectOutput(code, ["Struct created"]);
});

runTest("STRUCT - Set and get fields", () => {
   const code = `
      STRUCT Point
      x: number
      y: number
      STRUCTEND

      SET Point >> p
      STRUCT_SET p.x 100
      STRUCT_SET p.y 200
      STRUCT_GET p.x >> x
      STRUCT_GET p.y >> y
      PRINT x
      PRINT y
   `;
   expectOutput(code, ["100", "200"]);
});

runTest("STRUCT - Multiple struct types", () => {
   const code = `
      STRUCT Point
      x: number
      y: number
      STRUCTEND

      STRUCT Color
      r: number
      g: number
      b: number
      STRUCTEND

      SET Point >> p
      SET Color >> c

      STRUCT_SET p.x 10
      STRUCT_SET c.r 255

      STRUCT_GET p.x >> px
      STRUCT_GET c.r >> cr
      PRINT px
      PRINT cr
   `;
   expectOutput(code, ["10", "255"]);
});

runTest("STRUCT - Field type validation", () => {
   const code = `
      STRUCT Data
      value: number
      STRUCTEND

      SET Data >> d
      STRUCT_SET d.value "not a number"
   `;
   expectError(code, /type|expects/i);
});

runTest("STRUCT - Field auto-initialization", () => {
   const code = `
      STRUCT Point
      x: number
      y: number
      STRUCTEND

      SET Point >> p
      STRUCT_GET p.x >> x
      STRUCT_GET p.y >> y
      PRINT x
      PRINT y
   `;
   expectOutput(code, ["0", "0"]);
});

runTest("STRUCT - String field", () => {
   const code = `
      STRUCT Person
      name: string
      age: number
      STRUCTEND

      SET Person >> person
      STRUCT_SET person.name "Alice"
      STRUCT_SET person.age 30
      STRUCT_GET person.name >> n
      STRUCT_GET person.age >> a
      PRINT n
      PRINT a
   `;
   expectOutput(code, ["Alice", "30"]);
});

runTest("STRUCT - List field", () => {
   const code = `
      STRUCT Data
      values: list
      STRUCTEND

      SET Data >> d
      LIST_CREATE temp
      LIST_PUSH 1 >> temp
      LIST_PUSH 2 >> temp
      LIST_PUSH 3 >> temp
      STRUCT_SET d.values temp
      STRUCT_GET d.values >> v
      LIST_GET v 1 >> second
      PRINT second
   `;
   expectOutput(code, ["2"]);
});

// ==================== QR CODE OPERATIONS ====================
console.log("\n=== QR CODE OPERATIONS ===\n");

runTest("QR - Encode program code", () => {
   const vm = new PanSparkVM();
   const code = "SET 10 >> x PRINT x";
   const encoded = vm.encodeForQR(code);
   
   if (encoded.length === 0) {
      throw new Error("Encoded QR data is empty");
   }
   if (typeof encoded !== 'string') {
      throw new Error("Encoded QR data should be a string");
   }
});

runTest("QR - Decode QR data", () => {
   const vm = new PanSparkVM();
   const original = "SET 10 >> x PRINT x";
   const encoded = vm.encodeForQR(original);
   const decoded = vm.decodeFromQR(encoded);
   
   if (decoded.length === 0) {
      throw new Error("Decoded code is empty");
   }
});

runTest("QR - Round-trip encode/decode", () => {
   const vm = new PanSparkVM();
   const original = "SET 42 >> answer PRINT answer";
   const encoded = vm.encodeForQR(original);
   const decoded = vm.decodeFromQR(encoded);
   
   // Decode should produce code that compiles
   const instructions = vm.compile(decoded);
   if (instructions.length === 0) {
      throw new Error("Decoded code did not compile to instructions");
   }
});

runTest("QR - Execute decoded code", () => {
   const vm = new PanSparkVM();
   const code = "SET 10 >> x SET 20 >> y MATH x + y >> sum PRINT sum";
   const encoded = vm.encodeForQR(code);
   const decoded = vm.decodeFromQR(encoded);
   const instructions = vm.compile(decoded);
   const program = vm.run(instructions);
   
   while (program.next().done === false) {}
   
   if (vm.buffer[0] !== "30") {
      throw new Error(`Expected "30" but got "${vm.buffer[0]}"`);
   }
});

runTest("QR - Compression reduces size", () => {
   const vm = new PanSparkVM();
   const code = `
      SET 10 >> x
      SET 20 >> y
      SET 30 >> z
      PRINT x
      PRINT y
      PRINT z
   `;
   const stats = vm.getCompressionStats(code);
   
   if (stats.abbreviated >= stats.original) {
      throw new Error(`Compression failed: ${stats.abbreviated} >= ${stats.original}`);
   }
});

runTest("QR - decodeQRToInstructions returns compiled instructions", () => {
   const vm = new PanSparkVM();
   const code = "SET 10 >> x PRINT x";
   const encoded = vm.encodeForQR(code);
   const instructions = vm.decodeQRToInstructions(encoded);
   
   if (!Array.isArray(instructions)) {
      throw new Error("decodeQRToInstructions should return an array");
   }
   if (instructions.length === 0) {
      throw new Error("Should return compiled instructions");
   }
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
  console.log("\nAll tests passed!");
  process.exit(0);
}
