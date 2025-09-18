import { run, compile, resetVM, buffer } from "./runtime";
let code: string = `  
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
ECHO "Math Operation results"
PRINT answer
PRINT addResult
PRINT subResult
PRINT mulResult
PRINT divResult
PRINT modResult
PRINT expResult
PRINT sqrtResult
PRINT logResult
PRINT randResult
PRINT floorResult
PRINT ceilResult
PRINT sinResult

// ===== CONTROL FLOW =====
SET 0 >> counter
POINT loop_start
MATH counter + 1 >> counter
PRINT counter
IF counter < 5 >> loop_start

// ===== CONDITIONAL JUMPS =====
ECHO "Conditional Jumps"
SET 10 >> x
SET 15 >> y

IF x > y >> greater
IF x < y >> less
IF x == y >> equal
JUMP comparisons_done

POINT greater
PRINT 9001
JUMP comparisons_done

POINT less
PRINT 9000
JUMP comparisons_done

POINT equal
PRINT 9002

POINT comparisons_done

// ===== PROCEDURES (PROCs) =====
// Define a PROC to calculate factorial
ECHO "Procedures"
PROC factorial (n) {
    SET 1 >> result
    POINT factorial_loop
    IF n == 0 >> end_factorial_loop
    MATH result * n >> result
    MATH n - 1 >> n
    JUMP factorial_loop
    POINT end_factorial_loop
    RETURN result
}

// Call the 'factorial' PROC and store the result
// The arguments (e.g., 5) are passed to the PROC.
// The result is stored in the 'factorial_output' variable.
CALL factorial (5) >> factorial_output

// Print the final result
PRINT factorial_output
ECHO "program execution complete!"


// ===== END PROGRAM EXECUTION =====
END
`;

const program = run(compile(code));

while (program.next().done === false) {
}

for (let line of buffer) {
    console.log(line);
}

resetVM();