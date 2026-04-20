# Fix validateJumpTarget for Recursion Support

## Problem

`validateJumpTarget` is called during CALL operations, which blocks legitimate recursive patterns where a subroutine is defined inside an IF block. CALL/RET have their own call stack semantics and should not be constrained by IF block depth validation.

## Changes Required

### 1. Remove validateJumpTarget from CALL opcode

**File:** `panspark.ts:921-929`

**Current:**
```typescript
case OpCode.CALL:
  if (shouldExec) {
    const targetPos = instr.arguments[0].value as number;
    this.validateJumpTarget(targetPos, this.activeInstructionPos);
    this.pushCallStack(this.activeInstructionPos + 1);
    this.activeInstructionPos = targetPos;
    ipModified = true;
  }
  break;
```

**Change to:**
```typescript
case OpCode.CALL:
  if (shouldExec) {
    const targetPos = instr.arguments[0].value as number;
    this.pushCallStack(this.activeInstructionPos + 1);
    this.activeInstructionPos = targetPos;
    ipModified = true;
  }
  break;
```

### 2. Add bounds checking to validateJumpTarget

**File:** `panspark.ts:428-438`

**Current:**
```typescript
private validateJumpTarget(targetPos: number, currentPos: number): void {
  const currentDepth = this.instructionBlockDepth[currentPos] || 0;
  const targetDepth = this.instructionBlockDepth[targetPos] || 0;
  
  if (currentDepth !== targetDepth) {
    throw Error(
      `Cannot jump out of IF block! Jump from line ${currentPos + 1} (depth ${currentDepth}) to line ${targetPos + 1} (depth ${targetDepth})`,
    );
  }
}
```

**Change to:**
```typescript
private validateJumpTarget(targetPos: number, currentPos: number): void {
  if (currentPos < 0 || currentPos >= this.instructionBlockDepth.length) {
    throw Error(`Invalid instruction position: ${currentPos}`);
  }
  if (targetPos < 0 || targetPos >= this.instructionBlockDepth.length) {
    throw Error(`Invalid jump target: ${targetPos}`);
  }
  
  const currentDepth = this.instructionBlockDepth[currentPos];
  const targetDepth = this.instructionBlockDepth[targetPos];
  
  if (currentDepth !== targetDepth) {
    throw Error(
      `Cannot jump out of IF block! Jump from line ${currentPos + 1} (depth ${currentDepth}) to line ${targetPos + 1} (depth ${targetDepth})`,
    );
  }
}
```

## Rationale

- CALL/RET use the call stack for control flow, separate from IF block scoping
- JUMP is a raw goto and should remain constrained by IF block depth
- Bounds checking prevents silent failures from invalid positions
- Existing tests (recursive factorial, deep recursion) will continue to pass

## Verification

Run: `npx tsx tests.ts`

All existing tests should pass, including:
- "recursive factorial" (line 403)
- "stack overflow throws at call stack limit" (line 424)
- "call stack depth 128 — deep recursion within limit" (line 902)
- "call stack depth 128 — overflow at 129 throws" (line 921)
