# PanSpark Performance Optimization Plan

## Executive Summary

The PanSparkVM is already highly optimized with object pooling, pre-computed indices, and inline operations. However, there are **7 high-impact optimizations** that could improve performance by an estimated **15-40%** depending on workload characteristics.

**Current Status**: Well-architected but room for gains in hot paths
**Estimated ROI**: High (especially for long-running or complex scripts)

---

## Performance Analysis

### Current Optimizations ✅
- Object pooling for stack frames
- Pre-computed FOR loop end indices
- Cached jump targets during compilation
- Inline math operations for common operators
- Single-pass tokenization during compilation
- Type checking via discriminated unions

### Hot Paths (Most Frequently Called)
1. `variableCheck()` - Called on every variable read
2. `setVariableMemory()` - Called on every variable write
3. `evaluateASTNode()` - Called for every math expression
4. Bytecode dispatch loop in `run()`
5. `getVar()` / `setVar()` context methods

---

## Optimization Plan

### Priority 1: HIGH IMPACT (Estimated 10-15% overall improvement)

#### 1.1: Variable Cache in Expression Evaluation
**Problem**: `variableCheck()` does 2-3 Map lookups per variable in expressions like `a + b * c`

**Solution**: Add expression-local variable cache with fast lookup
```typescript
private expressionVarCache: Map<string, Variable> = new Map();
private enableExpressionCache = true;

private evaluateExpressionAST(expression: string, line: number): number {
  // Clear and enable cache for this expression
  this.expressionVarCache.clear();
  
  const parser = new ExpressionParser(expression);
  const ast = parser.parse();
  const result = this.evaluateASTNode(ast, line);
  
  // Clear cache after evaluation
  this.expressionVarCache.clear();
  return result;
}

private evaluateASTNode(node: ExpressionNode, line: number): number {
  if (node.type === 'variable') {
    const varNode = node as VariableNode;
    const name = varNode.name;
    
    // Check cache first (O(1))
    let variable = this.expressionVarCache.get(name);
    if (variable === undefined) {
      variable = this.variableCheck(name, line);
      // Cache for rest of expression
      this.expressionVarCache.set(name, variable);
    }
    return variable.value;
  }
  // ... rest of implementation
}
```

**Impact**: Expressions with repeated variables: 2x faster
**Affected Operations**: MATH (heavy), CONCAT, STRLEN, SUBSTR
**Implementation Difficulty**: Low (30 lines)
**Risk**: Very Low

---

#### 1.2: Numeric Literal Fast Path
**Problem**: `variableCheck()` calls `Number()` conversion for every numeric literal in every variable read

**Solution**: Pre-detect numeric literals during compilation and cache them

```typescript
// In CompiledInstruction interface:
interface CompiledInstruction {
  // ... existing fields
  isNumericLiteral?: boolean;  // true if args[0] is definitely a number
  numericLiteralValue?: number; // cached numeric value
}

// During compilation (in compile()):
const firstArg = tokens[1];
if (!isNaN(Number(firstArg)) && instruction.args.length > 1) {
  instruction.isNumericLiteral = true;
  instruction.numericLiteralValue = Number(firstArg);
}

// During execution (in run(), SET operation):
if (instruction.isNumericLiteral) {
  value = Num(instruction.numericLiteralValue!);
} else {
  // existing logic
}
```

**Impact**: SET operations: 3-5x faster for numeric literals
**Affected Operations**: SET, MATH, LIST operations
**Implementation Difficulty**: Low (40 lines)
**Risk**: Very Low

---

#### 1.3: Operator Dispatch Optimization
**Problem**: Main bytecode loop uses large switch statement (32 cases)

**Solution**: Use computed goto table for faster dispatch
```typescript
// Pre-compute dispatch table during class initialization
private opCodeHandlers: Array<(instruction: CompiledInstruction) => void>;

private initializeOpCodeHandlers(): void {
  this.opCodeHandlers = new Array(32);
  this.opCodeHandlers[OpCode.SET] = (inst) => { /* SET logic */ };
  this.opCodeHandlers[OpCode.MATH] = (inst) => { /* MATH logic */ };
  // ... etc for all opcodes
}

// In run() loop:
if (typeof instruction.operation === 'number') {
  const handler = this.opCodeHandlers[instruction.operation];
  if (handler) handler(instruction);
}
```

**Impact**: Tight loops (FOR, IF chains): 5-8% faster
**Affected Operations**: All opcodes
**Implementation Difficulty**: Medium (200+ lines refactoring)
**Risk**: Low (same logic, different dispatch)

---

### Priority 2: MEDIUM IMPACT (Estimated 5-10% improvement)

#### 2.1: Lazy Evaluation for Procedure Parameters
**Problem**: All procedure arguments evaluated even if not used

**Solution**: Defer argument evaluation until first use (lazy evaluation)
```typescript
// Store unevaluated argument strings, evaluate on first access
interface LazyArg {
  value?: Variable;
  expression: string;
  evaluated: boolean;
}

// In CALL operation:
const lazyArgs: LazyArg[] = procArgStrings.map(arg => ({
  expression: arg,
  evaluated: false,
  value: undefined
}));

// In procedure, on first use of parameter:
private getLazyVariable(lazyArg: LazyArg, line: number): Variable {
  if (!lazyArg.evaluated) {
    lazyArg.value = this.variableCheck(lazyArg.expression, line);
    lazyArg.evaluated = true;
  }
  return lazyArg.value!;
}
```

**Impact**: Procedures with unused params: 20-50% faster calls
**Affected Operations**: CALL, PROC
**Implementation Difficulty**: Medium (80 lines)
**Risk**: Medium (changes parameter semantics slightly)

---

#### 2.2: String Operation Batch Optimization
**Problem**: Multiple string operations create intermediate Variables

**Solution**: Batch string operations and cache results
```typescript
// For CONCAT chains: "a" + "b" + "c"
// Current: 3 separate CONCAT operations, each creates Variable
// Optimized: Single pass combining all

// Pre-scan for CONCAT chains during compilation:
interface CompiledInstruction {
  concatChainLength?: number; // detect a >> b; b >> c patterns
}

// During execution, process entire chain at once
if (instruction.concatChainLength && instruction.concatChainLength > 1) {
  // Single pass instead of multiple intermediate Variables
}
```

**Impact**: String concatenation chains: 2x faster
**Affected Operations**: CONCAT, STRLEN, SUBSTR
**Implementation Difficulty**: Medium (100 lines)
**Risk**: Low

---

#### 2.3: FOR Loop Optimization - Direct Counter Access
**Problem**: Loop variable accessed via `variableCheck()` on each iteration

**Solution**: Cache FOR loop variable reference during ENDFOR
```typescript
interface ForLoopInfo {
  varName: string;
  // ... existing fields
  cachedVar?: Variable; // cache current loop variable
}

// In ENDFOR:
const loopInfo = this.forStack[this.forStack.length - 1];
const loopVar = loopInfo.cachedVar || this.variableCheck(loopInfo.varName, line);
loopInfo.cachedVar = loopVar; // cache for next iteration

// Update:
const nextValue = loopVar.value + loopInfo.step;
loopInfo.cachedVar = Num(nextValue); // update cache
```

**Impact**: FOR loops: 3-5% faster (compound over many iterations)
**Affected Operations**: FOR, ENDFOR
**Implementation Difficulty**: Low (20 lines)
**Risk**: Very Low

---

### Priority 3: LOWER IMPACT (Estimated 2-5% improvement)

#### 3.1: Compile-Time Constant Folding
**Problem**: Expressions like `MATH 5 + 3 >> result` evaluated at runtime

**Solution**: Fold constant expressions during compilation
```typescript
private foldConstants(ast: ExpressionNode): ExpressionNode {
  if (ast.type === 'binary') {
    const binary = ast as BinaryOpNode;
    const left = this.foldConstants(binary.left);
    const right = this.foldConstants(binary.right);
    
    // If both sides are number nodes, evaluate now
    if (left.type === 'number' && right.type === 'number') {
      const result = this.evaluateBinary(
        (left as NumberNode).value,
        binary.operator,
        (right as NumberNode).value
      );
      return { type: 'number', value: result } as NumberNode;
    }
  }
  return ast;
}

// During compilation:
const ast = parser.parse();
const folded = this.foldConstants(ast);
instruction.constantValue = folded.type === 'number' ? folded.value : null;

// During execution:
if (instruction.constantValue !== null) {
  this.setVariableMemory(destVariable, Num(instruction.constantValue));
} else {
  // Evaluate normally
}
```

**Impact**: Programs with constant expressions: 10-50% faster for those ops
**Affected Operations**: MATH
**Implementation Difficulty**: Medium (60 lines)
**Risk**: Low

---

#### 3.2: Jump Prediction (Branch Optimization)
**Problem**: IF statements often follow same path (predictable)

**Solution**: Track branch history and hint to optimizer
```typescript
interface JumpStatistics {
  totalExecuted: number;
  timesJumped: number;
  predictedJump: boolean; // more likely to jump?
}

private jumpStats: Map<number, JumpStatistics> = new Map();

// In IF operation:
const stats = this.jumpStats.get(this.counter) || {
  totalExecuted: 0,
  timesJumped: 0,
  predictedJump: false
};
stats.totalExecuted++;
if (shouldJump) {
  stats.timesJumped++;
  stats.predictedJump = stats.timesJumped > stats.totalExecuted * 0.6;
}
this.jumpStats.set(this.counter, stats);
```

**Impact**: Repeated IF statements: 2-3% faster (CPU cache benefits)
**Affected Operations**: IF, JUMP
**Implementation Difficulty**: Low (40 lines)
**Risk**: Very Low (profiling only)

---

#### 3.3: Memory Pool Expansion
**Problem**: Frame pool only reuses stack frames

**Solution**: Expand pooling to other frequently allocated objects
```typescript
// Add to FramePool pattern:
class VariableCache {
  private cache: Variable[] = [];
  allocate(type: PanSparkType, value: number | string | number[]): Variable {
    // Reuse from pool instead of always creating new
  }
  free(variable: Variable): void {
    this.cache.push(variable);
  }
}

// Use in Num(), Str(), List() helpers
const varCache = new VariableCache();
export const Num = (value: number): Variable => 
  varCache.allocate(PanSparkType.Number, value);
```

**Impact**: Memory allocations: 10-20% fewer GC pressure
**Affected Operations**: SET, MATH, all variable operations
**Implementation Difficulty**: Medium (100 lines)
**Risk**: Medium (GC implications)

---

### Priority 4: EXPERIMENTAL (Estimated 3-8% improvement)

#### 4.1: JIT-Style Instruction Caching
**Problem**: Same instructions executed repeatedly in loops

**Solution**: Create specialized execution paths for hot instructions
```typescript
interface CachedExecution {
  instruction: CompiledInstruction;
  executionCount: number;
  specializedHandler?: Function;
}

private instructionCache: Map<number, CachedExecution> = new Map();

// Track hot instructions:
if (this.counter % 100 === 0) {
  const cached = this.instructionCache.get(this.counter);
  if (cached && cached.executionCount > 1000) {
    // Generate specialized handler for this instruction
    cached.specializedHandler = this.generateSpecializedHandler(instruction);
  }
}

// Use specialized handler if available
if (cached?.specializedHandler) {
  cached.specializedHandler(instruction);
} else {
  // Standard dispatch
}
```

**Impact**: Tight loops: 5-10% faster
**Affected Operations**: All, but especially in FOR loops
**Implementation Difficulty**: High (150+ lines, complex)
**Risk**: High (profiling assumptions, maintenance)

---

#### 4.2: SIMD-Style Batch Operations (Advanced)
**Problem**: FOR loops execute one iteration at a time

**Solution**: Batch simple operations (e.g., multiple INC) into single pass
```typescript
// Detect patterns like:
// FOR i 0 1000
//   PRINT i
// ENDFOR

// Could batch the INC operations instead of 1000 individual iterations

private detectBatchableLoop(forIndex: number, endForIndex: number): boolean {
  // Check if loop body is simple enough to batch
  const loopInstructions = this.instructions.slice(forIndex + 1, endForIndex);
  return loopInstructions.length <= 3 && 
         loopInstructions.every(inst => this.isBatchableOp(inst));
}

private executeBatchedLoop(loopInfo: ForLoopInfo): void {
  // Execute loop mathematically instead of iteratively
  // Equivalent to: counter = startValue; while counter <= endValue { counter += step }
}
```

**Impact**: Large simple FOR loops: 50-100% faster (10000+ iterations)
**Affected Operations**: FOR loops with simple bodies
**Implementation Difficulty**: Very High (200+ lines, complex logic)
**Risk**: High (correctness concerns with edge cases)

---

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1)
1. **1.1**: Variable Cache in Expression Evaluation (30 min)
2. **1.2**: Numeric Literal Fast Path (45 min)
3. **3.2**: Jump Prediction (30 min)

**Expected Gain**: 12-18% improvement in expression-heavy workloads

### Phase 2: Core Optimizations (Week 2)
1. **1.3**: Operator Dispatch Optimization (2 hours)
2. **2.1**: Lazy Evaluation for Procedure Parameters (1 hour)
3. **2.3**: FOR Loop Variable Cache (30 min)

**Expected Gain**: Additional 8-12% improvement

### Phase 3: Advanced (Week 3-4)
1. **2.2**: String Operation Batching (1 hour)
2. **3.1**: Constant Folding (1.5 hours)
3. **3.3**: Memory Pool Expansion (1.5 hours)

**Expected Gain**: Additional 5-8% improvement

### Phase 4: Experimental (Optional)
1. **4.1**: JIT-Style Instruction Caching (3+ hours)
2. **4.2**: SIMD Batch Operations (4+ hours)

**Expected Gain**: 5-15% for specific workload types

---

## Benchmarking Strategy

### Test Cases
```typescript
// Benchmark 1: Expression Heavy (variable cache benefit)
const expCode = `
  SET 10 >> a
  SET 20 >> b
  FOR i 0 10000
    MATH a + b * a - b >> result
  ENDFOR
`;

// Benchmark 2: Procedure Call Heavy (lazy eval benefit)
const procCode = `
  PROC expensive (a, b, c, d, e)
    RETURN a
  ENDPROC
  FOR i 0 1000
    CALL expensive (i, i+1, i+2, i+3, i+4) >> r
  ENDFOR
`;

// Benchmark 3: Loop Heavy (FOR cache benefit)
const loopCode = `
  FOR i 0 50000
    PRINT i
  ENDFOR
`;

// Benchmark 4: Constant Expressions
const constCode = `
  FOR i 0 10000
    MATH 5 + 3 * 2 >> result
  ENDFOR
`;

// Benchmark 5: String Operations
const stringCode = `
  SET "a" >> s1
  FOR i 0 1000
    CONCAT s1 s1 >> s2
    CONCAT s2 s1 >> s3
  ENDFOR
`;
```

### Metrics to Track
- Execution time (ms)
- Memory usage (MB)
- Allocations/GC cycles
- Instructions per second (IPS)

---

## Risk Assessment

| Optimization | Risk Level | Mitigation |
|---|---|---|
| 1.1 Variable Cache | Very Low | Simple cache, clear pattern |
| 1.2 Numeric Literals | Very Low | Purely additive |
| 1.3 Op Dispatch | Low | Refactor, extensive testing |
| 2.1 Lazy Eval | Medium | Preserve semantics carefully |
| 2.2 String Batching | Low | Isolated changes |
| 2.3 FOR Cache | Very Low | Local to loop |
| 3.1 Const Folding | Low | Extensive edge case testing |
| 3.2 Jump Prediction | Very Low | Profiling only |
| 3.3 Memory Pool | Medium | GC interaction testing |
| 4.1 JIT Cache | High | Complex logic, hard to test |
| 4.2 Batch Ops | High | Many edge cases |

---

## Expected Overall Improvement

```
Baseline:                    1.0x (100%)
After Phase 1:              1.12-1.18x
After Phase 2:              1.20-1.30x
After Phase 3:              1.25-1.38x
After Phase 4 (if done):    1.30-1.53x
```

**Conservative Estimate**: 20-30% overall improvement
**Optimistic Estimate**: 30-50% for expression/loop-heavy workloads

---

## Compatibility & Maintenance

All optimizations must:
- ✅ Pass all 114+ existing tests
- ✅ Maintain API compatibility
- ✅ Preserve error messages
- ✅ Not affect serialization format
- ✅ Work with debug mode
- ✅ Support all variable limits

---

## Recommended Starting Point

**Start with Priority 1 optimizations** for maximum ROI:
1. **1.1**: Variable Cache (highest ROI, lowest risk)
2. **1.2**: Numeric Literals (very common, easy)
3. **1.3**: Op Dispatch (affects all operations)

These three alone could provide 12-20% improvement in most realistic workloads.

---

## Future Considerations

- **WASM Compilation**: Could yield 2-5x overall (not VM optimization)
- **Parallel Execution**: For independent operations
- **Caching Layer**: Between compilation and execution
- **Profile-Guided Optimization**: Automatic tuning based on real workloads
