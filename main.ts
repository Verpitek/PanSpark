import { run, compile, resetVM, buffer } from "./runtime";
let code: string = `// ===== VARIABLE OPERATIONS =====
SET 42 >> answer
SET 100 >> initialValue
SET initialValue >> copiedValue

// ===== MATH OPERATIONS =====
MATH initialValue + 8 >> addResult
MATH initialValue - 15 >> subResult
MATH initialValue * 2 >> mulResult
MATH initialValue / 4 >> divResult
MATH initialValue % 3 >> modResult
MATH 2 ** 8 >> expResult
MATH 25 sqrt >> sqrtResult
MATH 100 log >> logResult
MATH 10 rand >> randResult
MATH 7.8 floor >> floorResult
MATH 7.2 ceil >> ceilResult
MATH 3.14159 sin >> sinResult

// ===== PRINT OPERATIONS =====
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
PROC loop_start
  MATH counter + 1 >> counter
  PRINT counter
  IF counter < 5 >> loop_start
ENDPROC

// ===== CONDITIONAL JUMPS =====
SET 10 >> x
SET 15 >> y

IF x > y >> greater
IF x < y >> less
IF x == y >> equal
JUMP comparisons_done

PROC greater
  PRINT 9001
ENDPROC
JUMP comparisons_done

PROC less
  PRINT 9000
ENDPROC
JUMP comparisons_done

PROC equal
  PRINT 9002
ENDPROC

PROC comparisons_done
ENDPROC

// ===== PROCEDURES =====
// they elevate the memory layer and act as a registered jump point
SET 5 >> factorial_input
SET 1 >> factorial_result
SET 1 >> factorial_counter

PROC factorial_loop
  MATH factorial_result * factorial_counter >> factorial_result
  MATH factorial_counter + 1 >> factorial_counter
  IF factorial_counter <= factorial_input >> factorial_loop
ENDPROC

PRINT factorial_result

// ===== RETURN EXAMPLE =====
SET 42 >> returnValue
RETURN returnValue

// ===== END (unreachable due to return) =====
END
PRINT 999999 // This won't execute`;

const kebab = await run(compile(code));

for (let i = 0; i < buffer.length; i++) {
  console.log(buffer[i]);
}

resetVM();