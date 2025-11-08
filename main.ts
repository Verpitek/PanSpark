import { PanSparkVM } from "./panspark";

// Get the start time
const startTime = new Date().getTime();

// Create multiple VM instances to demonstrate isolation
const vm1 = new PanSparkVM();

let code1: string = `
// ===== BASIC OPERATIONS =====
PRINT "Program started successfully"

// ===== VARIABLE OPERATIONS =====
SET 42 >> answer
SET 100 >> initialValue
SET initialValue >> copiedValue

// ===== MATH OPERATIONS =====
MATH initialValue + 8 >> addResult
MATH initialValue - 15 >> subResult
MATH initialValue * 2 >> mulResult
MATH initialValue / 4 >> divResult
MATH initialValue % 3 >> modResult
MATH initialValue min 59 >> minResult
MATH initialValue max 59 >> maxResult
MATH 2 ** 8 >> expResult
MATH 25 sqrt >> sqrtResult
MATH 100 log >> logResult
MATH 10 rand >> randResult
MATH 7.8 floor >> floorResult
MATH 7.2 ceil >> ceilResult
MATH 3.14159 sin >> sinResult
MATH 3.14159 cos >> cosResult
MATH 3.14159 tan >> tanResult
MATH -3443 abs >> absResult
MATH 23.43 round >> roundResult
MATH 3.9 log10 >> log10Result
MATH 32.21 exp >> expXResult

// ===== PRINT OPERATIONS =====
PRINT "=== Math Operation Results ==="
PRINT "Basic Operations:"
PRINT addResult
PRINT subResult
PRINT mulResult
PRINT divResult
PRINT modResult

PRINT "Advanced Math:"
PRINT expResult
PRINT sqrtResult
PRINT logResult
PRINT randResult
PRINT floorResult
PRINT ceilResult
PRINT sinResult
PRINT cosResult
PRINT tanResult
PRINT absResult
PRINT roundResult
PRINT log10Result
PRINT expXResult

// ===== MEMORY OPERATIONS =====
PRINT "=== Memory Operations ==="
SET 999 >> tempVar
PRINT tempVar
FREE tempVar
PRINT "Variable freed from memory"

// ===== INCREMENT/DECREMENT OPERATIONS =====
PRINT "=== Increment/Decrement Operations ==="
SET 10 >> counter
PRINT counter
INC counter
PRINT counter
DEC counter
DEC counter
PRINT counter


// ===== MEMORY DEBUGGING =====
PRINT "=== Memory Dump ==="
MEMDUMP

// ===== TICK COUNTER =====
PRINT "=== Execution Counter ==="
TICK currentTick
PRINT currentTick

// ===== CONTROL FLOW =====
PRINT "=== Control Flow - Loops ==="
SET 0 >> loopCounter
POINT loop_start
MATH loopCounter + 1 >> loopCounter
PRINT "Loop iteration:"
PRINT loopCounter
IF loopCounter < 5 >> loop_start

// ===== CONDITIONAL JUMPS =====
PRINT "=== Conditional Jumps ==="
SET 10 >> x
SET 15 >> y

IF x > y >> greater
IF x < y >> less
IF x == y >> equal
JUMP comparisons_done

POINT greater
PRINT "X is greater than Y"
PRINT 9001
JUMP comparisons_done

POINT less
PRINT "X is less than Y"
PRINT 9000
JUMP comparisons_done

POINT equal
PRINT "X equals Y"
PRINT 9002

POINT comparisons_done
PRINT "Comparisons completed"

// ===== ADVANCED COMPARISONS =====
PRINT "=== Advanced Comparisons ==="
SET 20 >> a
SET 20 >> b

IF a >= b >> greater_equal
PRINT "A is not >= B"
JUMP not_greater_equal

POINT greater_equal
PRINT "A is >= B"

POINT not_greater_equal

IF a <= b >> less_equal
PRINT "A is not <= B"
JUMP not_less_equal

POINT less_equal
PRINT "A is <= B"

POINT not_less_equal

IF a != b >> not_equal
PRINT "A equals B"
JUMP are_equal

POINT not_equal
PRINT "A does not equal B"

POINT are_equal

// ===== PROCEDURES (PROCs) =====
PRINT "=== Procedures ==="

// Define a PROC to calculate factorial
PROC factorial (n)
    SET 1 >> result
    POINT factorial_loop
    IF n <= 1 >> end_factorial_loop
    MATH result * n >> result
    MATH n - 1 >> n
    JUMP factorial_loop
    POINT end_factorial_loop
    RETURN result
ENDPROC

// Define a PROC to calculate Fibonacci (iterative to avoid stack overflow)
PROC fibonacci (n)
    IF n <= 1 >> fib_base_case
    SET 0 >> a
    SET 1 >> b
    SET 2 >> i
    
    POINT fib_loop
    IF i > n >> fib_done
    MATH a + b >> temp
    SET b >> a
    SET temp >> b
    MATH i + 1 >> i
    JUMP fib_loop
    
    POINT fib_done
    RETURN b
    
    POINT fib_base_case
    RETURN n
ENDPROC

// Define a PROC to find maximum of two numbers
PROC max_two (a, b)
    IF a > b >> a_greater
    RETURN b
    POINT a_greater
    RETURN a
ENDPROC

// Call procedures and demonstrate results
PRINT "Calculating factorial of 5:"
CALL factorial (5) >> factorial_result
PRINT factorial_result

PRINT "Calculating Fibonacci of 5:"
CALL fibonacci (5) >> fib_result
PRINT fib_result

PRINT "Finding max of 25 and 17:"
CALL max_two (25, 17) >> max_result
PRINT max_result


// ===== NO OPERATION =====
PRINT "=== No Operation Test ==="
NOP
PRINT "NOP executed successfully"

// ===== FINAL MEMORY STATE =====
PRINT "=== Final Memory State ==="
MEMDUMP

PRINT "=== Program Execution Complete! ==="

// ===== END PROGRAM EXECUTION =====
END`;

const instructions = vm1.compile(code1);
const program1 = vm1.run(instructions);

for (let j = 0; j < 10; j++) {
  program1.next();
}

const savedState = vm1.saveState(instructions);

for (let line of vm1.buffer) {
  console.log(line);
}

const vm2 = new PanSparkVM();
const restoredInstructions = vm2.loadState(savedState)!;
const gen2 = vm2.run(restoredInstructions);

while (gen2.next().done === false) {}

for (let line of vm2.buffer) {
  console.log(line);
}

vm1.resetVM();
vm2.resetVM();
const endTime = new Date().getTime();
const duration = endTime - startTime;
console.log(`\nTime taken to run: ${duration}ms`);