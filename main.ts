import { PanSparkVM } from "./panspark";

interface BenchmarkResult {
  name: string;
  duration: number;
  ticksExecuted: number;
  instructionCount: number;
  throughput: number; // instructions per ms
  bufferSize: number;
  memoryUsed: number;
}

class PanSparkBenchmark {
  private results: BenchmarkResult[] = [];

  private createVM(): PanSparkVM {
    return new PanSparkVM();
  }

  private runBenchmark(name: string, code: string, description: string): BenchmarkResult {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Running: ${name}`);
    console.log(`Description: ${description}`);
    console.log("=".repeat(60));

    const vm = this.createVM();
    const startTime = performance.now();
    
    const compiled = vm.compile(code);
    const instructionCount = compiled.length;
    
    let ticksExecuted = 0;
    const program = vm.run(compiled);
    
    while (!program.next().done) {
      ticksExecuted++;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const throughput = instructionCount / duration;
    const bufferSize = vm.getBuffer().length;
    const memoryUsed = vm.getVariableMemory().size;

    const result: BenchmarkResult = {
      name,
      duration,
      ticksExecuted,
      instructionCount,
      throughput,
      bufferSize,
      memoryUsed,
    };

    console.log(`✓ Completed in ${duration.toFixed(2)}ms`);
    console.log(`  Instructions: ${instructionCount}`);
    console.log(`  Ticks: ${ticksExecuted}`);
    console.log(`  Throughput: ${throughput.toFixed(2)} inst/ms`);
    console.log(`  Buffer lines: ${bufferSize}`);
    console.log(`  Memory vars: ${memoryUsed}`);

    this.results.push(result);
    return result;
  }

  // Benchmark 1: Basic arithmetic operations
  testArithmetic(): void {
    const code = `
      SET 10 >> a
      SET 20 >> b
      
      MATH a + b >> add_result
      MATH a - b >> sub_result
      MATH a * b >> mul_result
      MATH a / b >> div_result
      MATH a % 3 >> mod_result
      MATH 2 ** 10 >> exp_result
      
      PRINT add_result
      PRINT sub_result
      PRINT mul_result
      PRINT div_result
      PRINT mod_result
      PRINT exp_result
    `;
    
    this.runBenchmark(
      "Basic Arithmetic",
      code,
      "Tests basic math operations (+, -, *, /, %, **)"
    );
  }

  // Benchmark 2: Advanced math functions
  testAdvancedMath(): void {
    const code = `
      SET 25 >> num
      
      MATH num sqrt >> sqrt_result
      MATH num log >> log_result
      MATH num floor >> floor_result
      MATH num ceil >> ceil_result
      MATH 3.14159 sin >> sin_result
      MATH 3.14159 cos >> cos_result
      MATH 3.14159 tan >> tan_result
      MATH -42 abs >> abs_result
      MATH 7.7 round >> round_result
      MATH 100 log10 >> log10_result
      MATH 2 exp >> exp_result
      
      PRINT sqrt_result
      PRINT log_result
      PRINT sin_result
      PRINT cos_result
      PRINT tan_result
      PRINT abs_result
      PRINT round_result
      PRINT log10_result
      PRINT exp_result
    `;
    
    this.runBenchmark(
      "Advanced Math",
      code,
      "Tests advanced math functions (sqrt, log, trig, etc.)"
    );
  }

  // Benchmark 3: Loops and control flow
  testLoops(): void {
    const code = `
      SET 0 >> counter
      SET 0 >> sum
      
      POINT loop_start
      MATH sum + counter >> sum
      INC counter
      IF counter < 1000 >> loop_start
      
      PRINT sum
    `;
    
    this.runBenchmark(
      "Loop Performance",
      code,
      "Tests loop execution with 1000 iterations"
    );
  }

  // Benchmark 4: Conditional branching
  testConditionals(): void {
    const code = `
      SET 0 >> i
      SET 0 >> result
      
      POINT loop
      SET 50 >> threshold
      
      IF i < threshold >> branch_a
      IF i >= threshold >> branch_b
      JUMP continue
      
      POINT branch_a
      MATH result + 1 >> result
      JUMP continue
      
      POINT branch_b
      MATH result + 2 >> result
      
      POINT continue
      INC i
      IF i < 100 >> loop
      
      PRINT result
    `;
    
    this.runBenchmark(
      "Conditional Branching",
      code,
      "Tests IF statements and branching logic"
    );
  }

  // Benchmark 5: Procedure calls (shallow)
  testProcedureCallsShallow(): void {
    const code = `
      PROC add (a, b)
        MATH a + b >> result
        RETURN result
      }
      
      SET 0 >> sum
      SET 0 >> i
      
      POINT loop
      CALL add (i, 5) >> temp
      MATH sum + temp >> sum
      INC i
      IF i < 100 >> loop
      
      PRINT sum
    `;
    
    this.runBenchmark(
      "Procedure Calls (Shallow)",
      code,
      "Tests simple procedure calls (100 iterations)"
    );
  }

  // Benchmark 6: Nested procedure calls
  testProcedureCallsNested(): void {
    const code = `
      PROC add (a, b)
        MATH a + b >> result
        RETURN result
      }
      
      PROC add_three (a, b, c)
        CALL add (a, b) >> temp
        CALL add (temp, c) >> result
        RETURN result
      }
      
      PROC add_six (a, b, c, d, e, f)
        CALL add_three (a, b, c) >> temp1
        CALL add_three (d, e, f) >> temp2
        CALL add (temp1, temp2) >> result
        RETURN result
      }
      
      SET 0 >> i
      SET 0 >> sum
      
      POINT loop
      CALL add_six (1, 2, 3, 4, 5, 6) >> result
      MATH sum + result >> sum
      INC i
      IF i < 50 >> loop
      
      PRINT sum
    `;
    
    this.runBenchmark(
      "Nested Procedure Calls",
      code,
      "Tests deeply nested procedure calls"
    );
  }

  // Benchmark 7: Fibonacci calculation
  testFibonacci(): void {
    const code = `
      PROC fibonacci (n)
        IF n <= 1 >> base_case
        
        SET 0 >> a
        SET 1 >> b
        SET 2 >> i
        
        POINT fib_loop
        IF i > n >> fib_done
        MATH a + b >> temp
        SET b >> a
        SET temp >> b
        INC i
        JUMP fib_loop
        
        POINT fib_done
        RETURN b
        
        POINT base_case
        RETURN n
      }
      
      CALL fibonacci (30) >> result
      PRINT result
    `;
    
    this.runBenchmark(
      "Fibonacci (n=30)",
      code,
      "Calculates 30th Fibonacci number iteratively"
    );
  }

  // Benchmark 8: Factorial calculation
  testFactorial(): void {
    const code = `
      PROC factorial (n)
        SET 1 >> result
        POINT factorial_loop
        IF n <= 1 >> end_factorial
        MATH result * n >> result
        DEC n
        JUMP factorial_loop
        POINT end_factorial
        RETURN result
      }
      
      SET 0 >> i
      POINT loop
      CALL factorial (10) >> result
      INC i
      IF i < 100 >> loop
      
      PRINT result
    `;
    
    this.runBenchmark(
      "Factorial (10! × 100)",
      code,
      "Calculates 10! repeated 100 times"
    );
  }

  // Benchmark 9: Memory operations
  testMemoryOperations(): void {
    const code = `
      SET 0 >> i
      
      POINT create_loop
      SET i >> temp
      MATH temp * 2 >> temp
      INC i
      IF i < 100 >> create_loop
      
      SET 0 >> i
      POINT free_loop
      FREE temp
      INC i
      IF i < 50 >> free_loop
      
      PRINT i
    `;
    
    this.runBenchmark(
      "Memory Operations",
      code,
      "Tests variable creation and FREE operations"
    );
  }

  // Benchmark 10: Complex program (stress test)
  testComplexProgram(): void {
    const code = `
      PROC is_prime (n)
        IF n <= 1 >> not_prime
        IF n == 2 >> is_prime_true
        
        SET 2 >> divisor
        POINT check_divisor
        MATH n % divisor >> remainder
        IF remainder == 0 >> not_prime
        INC divisor
        MATH divisor * divisor >> divisor_squared
        IF divisor_squared <= n >> check_divisor
        
        POINT is_prime_true
        SET 1 >> result
        RETURN result
        
        POINT not_prime
        SET 0 >> result
        RETURN result
      }
      
      SET 2 >> num
      SET 0 >> prime_count
      
      POINT check_loop
      CALL is_prime (num) >> is_prime_result
      IF is_prime_result == 1 >> increment_count
      JUMP continue
      
      POINT increment_count
      INC prime_count
      
      POINT continue
      INC num
      IF num <= 100 >> check_loop
      
      PRINT prime_count
    `;
    
    this.runBenchmark(
      "Prime Number Counter",
      code,
      "Counts prime numbers from 2 to 100"
    );
  }

  // Benchmark 11: Inc/Dec operations
  testIncDec(): void {
    const code = `
      SET 0 >> counter
      POINT inc_loop
      INC counter
      IF counter < 1000 >> inc_loop
      
      POINT dec_loop
      DEC counter
      IF counter > 0 >> dec_loop
      
      PRINT counter
    `;
    
    this.runBenchmark(
      "INC/DEC Operations",
      code,
      "Tests increment and decrement operations (2000 total)"
    );
  }

  // Benchmark 12: All comparison operators
  testComparisons(): void {
    const code = `
      SET 0 >> i
      SET 0 >> results
      
      POINT loop
      SET 50 >> threshold
      
      IF i < threshold >> test_gt
      POINT test_gt
      IF i > threshold >> test_eq
      POINT test_eq
      IF i == threshold >> test_ne
      POINT test_ne
      IF i != threshold >> test_gte
      POINT test_gte
      IF i >= threshold >> test_lte
      POINT test_lte
      IF i <= threshold >> continue
      
      POINT continue
      INC results
      INC i
      IF i < 100 >> loop
      
      PRINT results
    `;
    
    this.runBenchmark(
      "Comparison Operators",
      code,
      "Tests all comparison operators (<, >, ==, !=, >=, <=)"
    );
  }

  // Run all benchmarks
  runAll(): void {
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║         PanSpark VM Benchmark Suite v1.0                  ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    
    const startTime = performance.now();

    this.testArithmetic();
    this.testAdvancedMath();
    this.testLoops();
    this.testConditionals();
    this.testProcedureCallsShallow();
    this.testProcedureCallsNested();
    this.testFibonacci();
    this.testFactorial();
    this.testMemoryOperations();
    this.testIncDec();
    this.testComparisons();
    this.testComplexProgram();

    const totalTime = performance.now() - startTime;

    this.printSummary(totalTime);
  }

  // Print summary statistics
  private printSummary(totalTime: number): void {
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║                    BENCHMARK SUMMARY                       ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log();

    const totalInstructions = this.results.reduce((sum, r) => sum + r.instructionCount, 0);
    const totalTicks = this.results.reduce((sum, r) => sum + r.ticksExecuted, 0);
    const avgThroughput = this.results.reduce((sum, r) => sum + r.throughput, 0) / this.results.length;

    console.log(`Total Benchmarks:        ${this.results.length}`);
    console.log(`Total Time:              ${totalTime.toFixed(2)}ms`);
    console.log(`Total Instructions:      ${totalInstructions.toLocaleString()}`);
    console.log(`Total Ticks Executed:    ${totalTicks.toLocaleString()}`);
    console.log(`Average Throughput:      ${avgThroughput.toFixed(2)} inst/ms`);
    console.log();

    console.log("Individual Benchmark Results:");
    console.log("─".repeat(80));
    console.log(
      "Benchmark".padEnd(30) + 
      "Time".padEnd(12) + 
      "Instructions".padEnd(15) + 
      "Throughput".padEnd(15)
    );
    console.log("─".repeat(80));

    for (const result of this.results) {
      console.log(
        result.name.padEnd(30) +
        `${result.duration.toFixed(2)}ms`.padEnd(12) +
        result.instructionCount.toString().padEnd(15) +
        `${result.throughput.toFixed(2)} i/ms`.padEnd(15)
      );
    }
    console.log("─".repeat(80));
    
    // Find fastest and slowest
    const fastest = this.results.reduce((min, r) => r.duration < min.duration ? r : min);
    const slowest = this.results.reduce((max, r) => r.duration > max.duration ? r : max);
    const highestThroughput = this.results.reduce((max, r) => r.throughput > max.throughput ? r : max);

    console.log();
    console.log(`⚡ Fastest:             ${fastest.name} (${fastest.duration.toFixed(2)}ms)`);
    console.log(`🐌 Slowest:             ${slowest.name} (${slowest.duration.toFixed(2)}ms)`);
    console.log(`🚀 Highest Throughput:  ${highestThroughput.name} (${highestThroughput.throughput.toFixed(2)} inst/ms)`);
    console.log();
  }
}

// Run the benchmark suite
const benchmark = new PanSparkBenchmark();
benchmark.runAll();