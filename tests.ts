import { VM, ArgType } from "./panspark";

// -------------------------------------------------------------------
// Minimal test harness
// -------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

function expect(actual: any, expected: any) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw Error(`Expected ${b} but got ${a}`);
}

function expectThrows(fn: () => void, containing?: string) {
  let threw = false;
  try { fn(); }
  catch (e: any) {
    threw = true;
    if (containing && !e.message.includes(containing)) {
      throw Error(`Expected error containing "${containing}" but got: ${e.message}`);
    }
  }
  if (!threw) throw Error("Expected an error to be thrown but nothing was thrown");
}

function run(source: string, vm?: VM): (number | string)[] {
  const v = vm ?? new VM(8, 16, 256, 1280);
  for (const _ of v.compile(source)) {}
  const output: (number | string)[] = [];
  const gen = v.run();
  while (!gen.next().done) {
    if (v.outputBuffer.length > 0) output.push(...v.outputBuffer);
  }
  return output;
}

function section(name: string) {
  console.log(`\n${name}`);
}

// -------------------------------------------------------------------
// 1. Precompiler
// -------------------------------------------------------------------

section("1. Precompiler");

test("explicit assignment", () => {
  const out = run(`
    $a = r0
    $b = r1
    SET 10 >> $a
    SET 20 >> $b
    ADD $a $b >> r2
    PRINT r2
    HALT
  `);
  expect(out, [30]);
});

test("auto assignment", () => {
  const out = run(`
    $x = auto
    $y = auto
    $z = auto
    SET 3 >> $x
    SET 4 >> $y
    MUL $x $y >> $z
    PRINT $z
    HALT
  `);
  expect(out, [12]);
});

test("mixed explicit and auto — auto skips claimed index", () => {
  const out = run(`
    $a = r2
    $b = auto
    $c = auto
    SET 1 >> $a
    SET 2 >> $b
    SET 3 >> $c
    ADD $a $b >> r0
    ADD r0 $c >> r0
    PRINT r0
    HALT
  `);
  expect(out, [6]);
});

test("name shadowing safety — $foobar not partially matched by $foo", () => {
  const out = run(`
    $foo    = r0
    $foobar = r1
    SET 10 >> $foo
    SET 20 >> $foobar
    PRINT $foobar
    PRINT $foo
    HALT
  `);
  expect(out, [20, 10]);
});

// -------------------------------------------------------------------
// 2. Basic Operations
// -------------------------------------------------------------------

section("2. Basic Operations");

test("SET and PRINT — integer", () => {
  expect(run(`SET 42 >> r0\nPRINT r0\nHALT`), [42]);
});

test("SET and PRINT — string", () => {
  expect(run(`SET "hello" >> r0\nPRINT r0\nHALT`), ["hello"]);
});

test("SET register to register", () => {
  expect(run(`SET 99 >> r0\nSET r0 >> r1\nPRINT r1\nHALT`), [99]);
});

test("PRINT literal", () => {
  expect(run(`PRINT 7\nHALT`), [7]);
});

// -------------------------------------------------------------------
// 3. Arithmetic
// -------------------------------------------------------------------

section("3. Arithmetic");

test("ADD", () => {
  expect(run(`SET 15 >> r0\nSET 27 >> r1\nADD r0 r1 >> r2\nPRINT r2\nHALT`), [42]);
});

test("SUB", () => {
  expect(run(`SET 100 >> r0\nSET 58 >> r1\nSUB r0 r1 >> r2\nPRINT r2\nHALT`), [42]);
});

test("MUL", () => {
  expect(run(`SET 6 >> r0\nSET 7 >> r1\nMUL r0 r1 >> r2\nPRINT r2\nHALT`), [42]);
});

test("DIV", () => {
  expect(run(`SET 84 >> r0\nSET 2 >> r1\nDIV r0 r1 >> r2\nPRINT r2\nHALT`), [42]);
});

test("DIV by zero throws", () => {
  expectThrows(() => run(`SET 10 >> r0\nSET 0 >> r1\nDIV r0 r1 >> r2\nHALT`), "Division by zero");
});

test("MOD", () => {
  expect(run(`SET 17 >> r0\nSET 5 >> r1\nMOD r0 r1 >> r2\nPRINT r2\nHALT`), [2]);
});

test("MOD by zero throws", () => {
  expectThrows(() => run(`SET 10 >> r0\nSET 0 >> r1\nMOD r0 r1 >> r2\nHALT`), "Modulo by zero");
});

test("POW", () => {
  expect(run(`SET 2 >> r0\nSET 8 >> r1\nPOW r0 r1 >> r2\nPRINT r2\nHALT`), [256]);
});

test("SQRT", () => {
  expect(run(`SET 144 >> r0\nSQRT r0 >> r1\nPRINT r1\nHALT`), [12]);
});

test("ABS", () => {
  expect(run(`SET -7 >> r0\nABS r0 >> r1\nPRINT r1\nHALT`), [7]);
});

test("MIN", () => {
  expect(run(`SET 3 >> r0\nSET 9 >> r1\nMIN r0 r1 >> r2\nPRINT r2\nHALT`), [3]);
});

test("MAX", () => {
  expect(run(`SET 3 >> r0\nSET 9 >> r1\nMAX r0 r1 >> r2\nPRINT r2\nHALT`), [9]);
});

test("INC", () => {
  expect(run(`SET 5 >> r0\nINC r0\nPRINT r0\nHALT`), [6]);
});

test("DEC", () => {
  expect(run(`SET 5 >> r0\nDEC r0\nPRINT r0\nHALT`), [4]);
});

test("INC and DEC combined", () => {
  expect(run(`SET 5 >> r0\nINC r0\nINC r0\nDEC r0\nPRINT r0\nHALT`), [6]);
});

test("RNG — result within bounds", () => {
  const out = run(`SET 1 >> r0\nSET 10 >> r1\nRNG r0 r1 >> r2\nPRINT r2\nHALT`);
  const n = out[0] as number;
  if (n < 1 || n > 10) throw Error(`RNG result ${n} out of bounds [1, 10]`);
});

test("arithmetic on string register throws", () => {
  expectThrows(
    () => run(`SET "oops" >> r0\nSET 5 >> r1\nADD r0 r1 >> r2\nHALT`),
    "Expected number but got string",
  );
});

// -------------------------------------------------------------------
// 4. Control Flow
// -------------------------------------------------------------------

section("4. Control Flow");

test("JUMP skips instructions", () => {
  expect(run(`JUMP end\nPRINT 999\nPOINT end\nPRINT 1\nHALT`), [1]);
});

test("IF — true branch taken", () => {
  expect(run(`SET 5 >> r0\nIF r0 == 5 >> match\nPRINT 0\nHALT\nPOINT match\nPRINT 1\nHALT`), [1]);
});

test("IF — false branch not taken", () => {
  expect(run(`SET 3 >> r0\nIF r0 == 5 >> match\nPRINT 0\nHALT\nPOINT match\nPRINT 1\nHALT`), [0]);
});

test("IF string equality", () => {
  expect(run(`SET "iron_ore" >> r0\nIF r0 == "iron_ore" >> match\nPRINT 0\nHALT\nPOINT match\nPRINT 1\nHALT`), [1]);
});

test("IF string inequality", () => {
  expect(run(`SET "gold_ore" >> r0\nIF r0 != "iron_ore" >> match\nPRINT 0\nHALT\nPOINT match\nPRINT 1\nHALT`), [1]);
});

test("IF ordering operators", () => {
  expect(run(`
    SET 5 >> r0
    IF r0 > 3 >> a
    PRINT 0
    HALT
    POINT a
    IF r0 < 10 >> b
    PRINT 0
    HALT
    POINT b
    PRINT 1
    HALT
  `), [1]);
});

test("IF ordering on string throws", () => {
  expectThrows(
    () => run(`SET "abc" >> r0\nSET "xyz" >> r1\nIF r0 < r1 >> nope\nHALT\nPOINT nope\nHALT`),
    "Expected number or array but got string",
  );
});

test("IF-ELSE — true branch taken", () => {
  expect(run(`
    SET 5 >> r0
    IF r0 == 5 >> trueLabel ELSE falseLabel
    PRINT 0
    HALT
    POINT trueLabel
    PRINT 1
    HALT
    POINT falseLabel
    PRINT 2
    HALT
  `), [1]);
});

test("IF-ELSE — false branch taken", () => {
  expect(run(`
    SET 3 >> r0
    IF r0 == 5 >> trueLabel ELSE falseLabel
    PRINT 0
    HALT
    POINT trueLabel
    PRINT 1
    HALT
    POINT falseLabel
    PRINT 2
    HALT
  `), [2]);
});

test("IF-ELSE — string equality true", () => {
  expect(run(`
    SET "iron_ore" >> r0
    IF r0 == "iron_ore" >> trueLabel ELSE falseLabel
    PRINT 0
    HALT
    POINT trueLabel
    PRINT 1
    HALT
    POINT falseLabel
    PRINT 2
    HALT
  `), [1]);
});

test("IF-ELSE — string equality false", () => {
  expect(run(`
    SET "gold_ore" >> r0
    IF r0 == "iron_ore" >> trueLabel ELSE falseLabel
    PRINT 0
    HALT
    POINT trueLabel
    PRINT 1
    HALT
    POINT falseLabel
    PRINT 2
    HALT
  `), [2]);
});

test("IF-ELSE — ordering operators", () => {
  expect(run(`
    SET 5 >> r0
    IF r0 > 3 >> a ELSE b
    PRINT 0
    HALT
    POINT a
    IF r0 < 10 >> c ELSE d
    PRINT 0
    HALT
    POINT b
    PRINT 0
    HALT
    POINT c
    PRINT 1
    HALT
    POINT d
    PRINT 0
    HALT
  `), [1]);
});

test("IF-ELSE — missing else label throws", () => {
  expectThrows(
    () => run(`IF r0 == 5 >> true ELSE\nHALT\nPOINT true\nHALT`),
    "Missing label after ELSE",
  );
});

test("IF-ELSE with named variables", () => {
  expect(run(`
    $val = auto
    SET 7 >> $val
    IF $val > 5 >> high ELSE low
    PRINT 0
    HALT
    POINT high
    PRINT 1
    HALT
    POINT low
    PRINT 2
    HALT
  `), [1]);
});

test("countdown loop", () => {
  expect(run(`
    SET 5 >> r0
    POINT loop
      PRINT r0
      DEC r0
      IF r0 > 0 >> loop
    HALT
  `), [5, 4, 3, 2, 1]);
});

test("undefined label throws", () => {
  expectThrows(() => run(`JUMP nowhere\nHALT`), `Undefined label`);
});

// -------------------------------------------------------------------
// 5. Functions
// -------------------------------------------------------------------

section("5. Functions (CALL / RET)");

test("simple function call", () => {
  expect(run(`
    CALL greet
    HALT
    POINT greet
      PRINT 42
      RET
  `), [42]);
});

test("recursive factorial", () => {
  expect(run(`
    SET 5 >> r0
    SET 1 >> r1
    CALL factorial
    PRINT r1
    HALT
    POINT factorial
      IF r0 == 0 >> done
      MUL r1 r0 >> r1
      DEC r0
      CALL factorial
    POINT done
      RET
  `), [120]);
});

test("stack underflow throws", () => {
  expectThrows(() => run(`RET\nHALT`), "Stack underflow");
});

test("stack overflow throws at call stack limit", () => {
  // call stack depth 4 — infinite recursion should overflow
  const vm = new VM(8, 16, 4, 1280);
  expectThrows(() => run(`
    CALL inf
    HALT
    POINT inf
      CALL inf
      RET
  `, vm), "Stack overflow");
});

// -------------------------------------------------------------------
// 6. UNTIL
// -------------------------------------------------------------------

section("6. UNTIL");

test("passes immediately when condition already true", () => {
  expect(run(`SET 1 >> r0\nUNTIL r0 == 1\nPRINT 1\nHALT`), [1]);
});

test("unblocks when condition becomes true", () => {
  const vm = new VM(8, 16, 256, 1280);
  for (const _ of vm.compile(`UNTIL r0 == 1\nPRINT 1\nHALT`)) {}

  const output: (number | string)[] = [];
  const gen = vm.run();

  // spin a few steps while r0 is still 0
  for (let i = 0; i < 5; i++) gen.next();

  // simulate external event
  vm.registerMemory[0] = { tag: "int", data: 1 };

  // drain to completion
  while (!gen.next().done) {
    if (vm.outputBuffer.length > 0) output.push(...vm.outputBuffer);
  }

  expect(output, [1]);
});

// -------------------------------------------------------------------
// 7. Heap
// -------------------------------------------------------------------

section("7. Heap");

test("integer heap usage — exact fit", () => {
  const vm = new VM(4, 0, 256, 8); // 4 × 2 = 8 bytes exactly
  for (const _ of vm.compile(`SET 1 >> r0\nSET 2 >> r1\nSET 3 >> r2\nSET 4 >> r3\nHALT`)) {}
  const gen = vm.run();
  while (!gen.next().done) {}
  expect(vm.heapAvailable(), 0);
});

test("heap overflow throws", () => {
  const vm = new VM(2, 0, 256, 4); // 2 × 2 = 4 bytes, no room for strings
  expectThrows(
    () => run(`SET "toolong" >> r0\nHALT`, vm),
    "Heap overflow",
  );
});

test("heap freed on overwrite", () => {
  const vm = new VM(2, 0, 256, 20);
  expect(run(`
    SET "hello" >> r0
    SET 0 >> r0
    SET "world" >> r1
    PRINT r1
    HALT
  `, vm), ["world"]);
});

test("heapAvailable reflects current usage", () => {
  const vm = new VM(4, 0, 256, 1280);
  const before = vm.heapAvailable();
  for (const _ of vm.compile(`SET "test" >> r0\nHALT`)) {}
  const gen = vm.run();
  while (!gen.next().done) {}
  // "test" = 5 bytes, replaced 2-byte int → delta 3
  expect(vm.heapAvailable(), before - 3);
});

// -------------------------------------------------------------------
// 8. Peripherals
// -------------------------------------------------------------------

section("8. Custom OpCodes (Peripherals)");

test("MATH_FAC peripheral", () => {
  const vm = new VM(8, 16, 256, 1280);
  vm.registerPeripheral("MATH_FAC", (vm, args) => {
    const n = vm.fetchMemory(args[0]);
    let acc = 1;
    for (let i = 2; i <= n; i++) acc *= i;
    vm.setMemory(acc, args[1]);
  });
  expect(run(`SET 6 >> r0\nMATH_FAC r0 >> r1\nPRINT r1\nHALT`, vm), [720]);
});

test("peripheral with string argument", () => {
  const vm = new VM(8, 16, 256, 1280);
  vm.registerPeripheral("ECHO", (vm, args) => {
    vm.outputBuffer.push(vm.fetchValue(args[0]));
  });
  expect(run(`ECHO "ping"\nHALT`, vm), ["ping"]);
});

test("unregistered peripheral throws", () => {
  expectThrows(() => run(`GHOST_OP r0\nHALT`), `Unknown OpCode`);
});

test("peripheral can read and write registers", () => {
  const vm = new VM(8, 16, 256, 1280);
  vm.registerPeripheral("DOUBLE", (vm, args) => {
    const val = vm.fetchMemory(args[0]);
    vm.setMemory(val * 2, args[1]);
  });
  expect(run(`SET 21 >> r0\nDOUBLE r0 >> r1\nPRINT r1\nHALT`, vm), [42]);
});

// -------------------------------------------------------------------
// 9. State Persistence
// -------------------------------------------------------------------

section("9. State Persistence");

test("saveState and loadState — resumes correctly", () => {
  const source = `
    SET 0 >> r0
    SET 0 >> r1
    POINT loop
      INC r1
      ADD r0 r1 >> r0
      IF r1 < 10 >> loop
    PRINT r0
    HALT
  `;

  // run to completion on vm1
  const vm1 = new VM(8, 16, 256, 1280);
  const full = run(source, vm1);

  // run halfway on vm2, save, restore to vm3, finish
  const vm2 = new VM(8, 16, 256, 1280);
  for (const _ of vm2.compile(source)) {}
  const gen2 = vm2.run();
  for (let i = 0; i < 10; i++) gen2.next();

  const snapshot = vm2.saveState();

  const vm3 = new VM(8, 16, 256, 1280);
  vm3.loadState(snapshot);

  const output: (number | string)[] = [];
  const gen3 = vm3.run();
  while (!gen3.next().done) {
    if (vm3.outputBuffer.length > 0) output.push(...vm3.outputBuffer);
  }

  expect(output, full); // should match a full run
});

test("peripheral name survives saveState", () => {
  const handler = (vm: VM, args: any[]) => {
    vm.setMemory(vm.fetchMemory(args[0]) * 3, args[1]);
  };

  const vm1 = new VM(8, 16, 256, 1280);
  vm1.registerPeripheral("TRIPLE", handler);
  for (const _ of vm1.compile(`SET 7 >> r0\nTRIPLE r0 >> r1\nPRINT r1\nHALT`)) {}

  const snapshot = vm1.saveState();

  const vm2 = new VM(8, 16, 256, 1280);
  vm2.registerPeripheral("TRIPLE", handler); // re-register
  vm2.loadState(snapshot);

  const output: (number | string)[] = [];
  const gen = vm2.run();
  while (!gen.next().done) {
    if (vm2.outputBuffer.length > 0) output.push(...vm2.outputBuffer);
  }

  expect(output, [21]);
});

test("registers survive saveState — including strings", () => {
  const vm1 = new VM(8, 16, 256, 1280);
  for (const _ of vm1.compile(`SET "lunatech" >> r0\nSET 42 >> r1\nHALT`)) {}
  const gen = vm1.run();
  while (!gen.next().done) {}

  const snapshot = vm1.saveState();
  const vm2 = new VM(8, 16, 256, 1280);
  vm2.loadState(snapshot);

  expect(vm2.registerMemory[0], { tag: "string", data: "lunatech" });
  expect(vm2.registerMemory[1], { tag: "int",    data: 42 });
});

// -------------------------------------------------------------------
// 10. NOP and HALT
// -------------------------------------------------------------------

section("10. NOP and HALT");

test("NOP does nothing", () => {
  expect(run(`NOP\nNOP\nPRINT 1\nHALT`), [1]);
});

test("HALT stops immediately", () => {
  expect(run(`HALT\nPRINT 999`), []);
});

// -------------------------------------------------------------------
// 11. Arrays
// -------------------------------------------------------------------

section("11. Arrays");

test("SET array literal", () => {
  expect(run(`SET [1,2,3] >> r0\nPRINT r0\nHALT`), ["[1,2,3]"]);
});

test("SET empty array throws", () => {
  expectThrows(() => run(`SET [] >> r0\nHALT`), "Empty array literal not allowed");
});

test("SET invalid array literal throws", () => {
  expectThrows(() => run(`SET [1,foo,3] >> r0\nHALT`), "Invalid array literal");
});

test("PRINT array", () => {
  expect(run(`SET [10,20,30] >> r0\nPRINT r0\nHALT`), ["[10,20,30]"]);
});

test("ARR_NEW creates zero-filled array", () => {
  expect(run(`ARR_NEW 5 >> r0\nPRINT r0\nHALT`), ["[0,0,0,0,0]"]);
});

test("ARR_NEW negative size throws", () => {
  expectThrows(() => run(`ARR_NEW -1 >> r0\nHALT`), "Array size cannot be negative");
});

test("ARR_PUSH appends element", () => {
  expect(run(`SET [1,2] >> r0\nARR_PUSH r0 3\nPRINT r0\nHALT`), ["[1,2,3]"]);
});

test("ARR_POP removes last element", () => {
  const out = run(`SET [1,2,3] >> r0\nARR_POP r0 >> r1\nPRINT r1\nPRINT r0\nHALT`);
  expect(out, [3, "[1,2]"]);
});

test("ARR_POP empty array returns 0", () => {
  expect(run(`ARR_NEW 0 >> r0\nARR_POP r0 >> r1\nPRINT r1\nHALT`), [0]);
});

test("ARR_GET reads element", () => {
  expect(run(`SET [10,20,30] >> r0\nARR_GET r0 1 >> r1\nPRINT r1\nHALT`), [20]);
});

test("ARR_GET out of bounds throws", () => {
  expectThrows(() => run(`SET [1,2] >> r0\nARR_GET r0 5 >> r1\nHALT`), "Array index 5 out of bounds");
});

test("ARR_SET writes element", () => {
  expect(run(`SET [1,2,3] >> r0\nARR_SET r0 1 99\nPRINT r0\nHALT`), ["[1,99,3]"]);
});

test("ARR_LEN returns length", () => {
  expect(run(`SET [5,10,15,20] >> r0\nARR_LEN r0 >> r1\nPRINT r1\nHALT`), [4]);
});

test("ARR_SORT sorts array", () => {
  expect(run(`SET [3,1,4,2] >> r0\nARR_SORT r0\nPRINT r0\nHALT`), ["[1,2,3,4]"]);
});

test("IF array sum equality true", () => {
  expect(run(`SET [1,2,3] >> r0\nSET 6 >> r1\nIF r0 == r1 >> equal\nPRINT 0\nHALT\nPOINT equal\nPRINT 1\nHALT`), [1]);
});

test("IF array sum equality false", () => {
  expect(run(`SET [1,2,3] >> r0\nSET 7 >> r1\nIF r0 == r1 >> equal\nPRINT 0\nHALT\nPOINT equal\nPRINT 1\nHALT`), [0]);
});

test("IF array sum equality with another array", () => {
  expect(run(`SET [1,2,3] >> r0\nSET [6] >> r1\nIF r0 == r1 >> equal\nPRINT 0\nHALT\nPOINT equal\nPRINT 1\nHALT`), [1]);
});

test("IF array ordering (sum <)", () => {
  expect(run(`SET [1,2] >> r0\nSET 4 >> r1\nIF r0 < r1 >> less\nPRINT 0\nHALT\nPOINT less\nPRINT 1\nHALT`), [1]);
});

test("IF array ordering (sum >)", () => {
  expect(run(`SET [5,10] >> r0\nSET 12 >> r1\nIF r0 > r1 >> greater\nPRINT 0\nHALT\nPOINT greater\nPRINT 1\nHALT`), [1]);
});

test("IF array vs string throws", () => {
  expectThrows(() => run(`SET [1,2] >> r0\nSET "abc" >> r1\nIF r0 < r1 >> nope\nHALT\nPOINT nope\nHALT`), "Expected number or array but got string");
});

test("heap accounting for arrays", () => {
  const vm = new VM(8, 16, 256, 1280);
  const before = vm.heapAvailable();
  run(`SET [1,2,3,4,5] >> r0\nHALT`, vm);
  // 5 elements × 2 bytes = 10 bytes, minus 2 bytes for replaced integer = 8 bytes delta
  expect(vm.heapAvailable(), before - 8);
});

test("heap overflow with large array", () => {
  const vm = new VM(8, 0, 256, 10); // 10 bytes heap
  expectThrows(() => run(`SET [1,2,3,4,5,6] >> r0\nHALT`, vm), "Heap overflow");
});

// -------------------------------------------------------------------
// 12. Machine Registers (x-bank)
// -------------------------------------------------------------------

section("12. Machine Registers (x-bank)");

test("SET and PRINT integer via x-register", () => {
  expect(run(`SET 42 >> x0\nPRINT x0\nHALT`), [42]);
});

test("SET and PRINT string via x-register", () => {
  expect(run(`SET "lunatech" >> x0\nPRINT x0\nHALT`), ["lunatech"]);
});

test("SET x-register to x-register", () => {
  expect(run(`SET 99 >> x0\nSET x0 >> x1\nPRINT x1\nHALT`), [99]);
});

test("SET r-register to x-register and back", () => {
  expect(run(`SET 7 >> r0\nSET r0 >> x0\nSET x0 >> r1\nPRINT r1\nHALT`), [7]);
});

test("ADD using x-registers", () => {
  expect(run(`SET 15 >> x0\nSET 27 >> x1\nADD x0 x1 >> x2\nPRINT x2\nHALT`), [42]);
});

test("arithmetic mix of r and x registers", () => {
  expect(run(`SET 10 >> r0\nSET 5 >> x0\nMUL r0 x0 >> x1\nPRINT x1\nHALT`), [50]);
});

test("IF condition on x-register", () => {
  expect(run(`SET 5 >> x0\nIF x0 == 5 >> match\nPRINT 0\nHALT\nPOINT match\nPRINT 1\nHALT`), [1]);
});

test("IF string comparison on x-register", () => {
  expect(run(`SET "iron_ore" >> x0\nIF x0 == "iron_ore" >> match\nPRINT 0\nHALT\nPOINT match\nPRINT 1\nHALT`), [1]);
});

test("x-register out of bounds throws", () => {
  const vm = new VM(8, 2, 256, 1280); // only x0 and x1
  expectThrows(() => run(`SET 1 >> x5\nHALT`, vm), "Outside machine memory bounds");
});

test("$name = x3 variable declaration", () => {
  expect(run(`
    $slot = x0
    SET 77 >> $slot
    PRINT $slot
    HALT
  `), [77]);
});

test("$name = x3 explicit declaration does not affect auto counter", () => {
  expect(run(`
    $slot = x0
    $a    = auto
    $b    = auto
    SET 1 >> $slot
    SET 2 >> $a
    SET 3 >> $b
    ADD $a $b >> r2
    PRINT $slot
    PRINT r2
    HALT
  `), [1, 5]);
});

test("array stored in x-register", () => {
  expect(run(`SET [1,2,3] >> x0\nPRINT x0\nHALT`), ["[1,2,3]"]);
});

test("ARR_PUSH on x-register array", () => {
  expect(run(`SET [1,2] >> x0\nARR_PUSH x0 3\nPRINT x0\nHALT`), ["[1,2,3]"]);
});

test("ARR_GET from x-register array into r-register", () => {
  expect(run(`SET [10,20,30] >> x0\nARR_GET x0 1 >> r0\nPRINT r0\nHALT`), [20]);
});

test("x-register heap contribution tracked", () => {
  const vm = new VM(1, 1, 256, 4); // 1 r-reg + 1 x-reg = 2×2 = 4 bytes exactly
  for (const _ of vm.compile(`SET 1 >> r0\nSET 2 >> x0\nHALT`)) {}
  const gen = vm.run();
  while (!gen.next().done) {}
  expect(vm.heapAvailable(), 0);
});

test("x-register heap overflow throws", () => {
  const vm = new VM(1, 1, 256, 4); // 4 bytes total — no room for a string
  expectThrows(() => run(`SET "toolong" >> x0\nHALT`, vm), "Heap overflow");
});

test("machine memory survives saveState/loadState", () => {
  const vm1 = new VM(8, 16, 256, 1280);
  for (const _ of vm1.compile(`SET "lunatech" >> x0\nSET 42 >> x1\nHALT`)) {}
  const gen = vm1.run();
  while (!gen.next().done) {}

  const snapshot = vm1.saveState();
  const vm2 = new VM(8, 16, 256, 1280);
  vm2.loadState(snapshot);

  expect(vm2.machineMemory[0], { tag: "string", data: "lunatech" });
  expect(vm2.machineMemory[1], { tag: "int",    data: 42 });
});

test("peripheral can read and write x-registers", () => {
  const vm = new VM(8, 16, 256, 1280);
  vm.registerPeripheral("DOUBLE_X", (vm, args) => {
    const val = vm.fetchMemory(args[0]);
    vm.setMemory(val * 2, args[1]);
  });
  expect(run(`SET 21 >> x0\nDOUBLE_X x0 >> x1\nPRINT x1\nHALT`, vm), [42]);
});

// -------------------------------------------------------------------
// 13. Extended register range (r0–r15, matching editor default)
// -------------------------------------------------------------------

section("13. Extended register range (r0–r15)");

test("SET and PRINT on r15", () => {
  const vm = new VM(16, 16, 128, 1280);
  expect(run(`SET 99 >> r15\nPRINT r15\nHALT`, vm), [99]);
});

test("arithmetic across r0 and r15", () => {
  const vm = new VM(16, 16, 128, 1280);
  expect(run(`SET 40 >> r0\nSET 2 >> r15\nADD r0 r15 >> r8\nPRINT r8\nHALT`, vm), [42]);
});

test("r-register out of bounds throws with 16-reg VM", () => {
  const vm = new VM(16, 16, 128, 1280);
  expectThrows(() => run(`SET 1 >> r16\nHALT`, vm), "Outside register memory bounds");
});

test("IF across r8 and x8", () => {
  const vm = new VM(16, 16, 128, 1280);
  expect(run(`SET 7 >> r8\nSET 7 >> x8\nIF r8 == x8 >> match\nPRINT 0\nHALT\nPOINT match\nPRINT 1\nHALT`, vm), [1]);
});

test("auto assigns into r8–r15 when lower regs are claimed", () => {
  const vm = new VM(16, 16, 128, 1280);
  const out = run(`
    $a = r0
    $b = r1
    $c = r2
    $d = r3
    $e = r4
    $f = r5
    $g = r6
    $h = r7
    $i = auto
    SET 99 >> $i
    PRINT $i
    HALT
  `, vm);
  expect(out, [99]); // $i → r8
});

test("call stack depth 128 — deep recursion within limit", () => {
  // 127 nested calls — should succeed
  const vm = new VM(16, 16, 128, 1280);
  expect(run(`
    SET 127 >> r0
    SET 0 >> r1
    CALL depth
    PRINT r1
    HALT
    POINT depth
      IF r0 == 0 >> dret
      DEC r0
      INC r1
      CALL depth
    POINT dret
      RET
  `, vm), [127]);
});

test("call stack depth 128 — overflow at 129 throws", () => {
  const vm = new VM(16, 16, 128, 1280);
  expectThrows(() => run(`
    SET 130 >> r0
    CALL depth
    HALT
    POINT depth
      IF r0 == 0 >> dret
      DEC r0
      CALL depth
    POINT dret
      RET
  `, vm), "Stack overflow");
});

// -------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);