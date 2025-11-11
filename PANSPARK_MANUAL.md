```
   ╔═══════════════════════════════════════════════════════════════════╗
   ║                                                                   ║
   ║               PANSPARK SCRIPTING LANGUAGE MANUAL                  ║
   ║                     A Retro Coding Adventure                      ║
   ║                                                                   ║
   ║                   "One Operation Per Line, Sir"                   ║
   ║                                                                   ║
   ╚═══════════════════════════════════════════════════════════════════╝
```

---

# 📖 PAGE 1: WELCOME TO PANSPARK

Welcome, fellow programmer! You've just loaded one of the most straightforward scripting languages ever created. Whether you're 8 or 80, PanSpark speaks a language you can understand.

## What is PanSpark?

PanSpark is a **tick-based interpreted OpCode scripting language** designed for predictable performance and ease of parsing. Think of it as giving a robot instructions—one command at a time, nice and clear.

**Key Philosophy:**
- **One operation per line** — No confusion, no hidden operations
- **Strict but fair** — Predictable performance and behavior
- **Perfect for learning** — Every command does exactly what it says
- **Memory conscious** — You can manage memory if you need to

## The Three Types We Work With

PanSpark has three main data types (even if there are more behind the scenes):

| Type | What It Is | Example |
|------|-----------|---------|
| **Number** | Integers and decimals | `42`, `3.14`, `-100` |
| **String** | Text | `"Hello World"`, `"PanSpark"` |
| **List** | Multiple numbers together | `[1, 2, 3, 4, 5]` |

---

# 📖 PAGE 2: YOUR FIRST PROGRAM

Let's start simple. Here's the tiniest PanSpark program:

```panspark
PRINT "Hello, World!"
END
```

**What happens:**
1. `PRINT` displays text
2. `"Hello, World!"` is the text to display
3. `END` stops the program

> **ℹ️ INFO:** `END` is optional! Your program stops when it runs out of instructions anyway. But it's polite to tell it when to stop.

Let's try something with numbers:

```panspark
SET 10 >> number1
SET 20 >> number2
MATH number1 + number2 >> result
PRINT result
END
```

**What happens:**
1. Store `10` in `number1`
2. Store `20` in `number2`
3. Add them together and store in `result`
4. Display the `result` (which is `30`)
5. Stop

> **ℹ️ INFO:** The `>>` symbol means "pipe this to" or "store in". It's the arrow that shows where data flows!

---

# 📖 PAGE 3: VARIABLES - YOUR STORAGE BOXES

Variables are like labeled storage boxes. You put things in them, label them with a name, and take them out when you need them.

## Creating Variables with SET

```panspark
SET 10 >> my_number
PRINT my_number
```

This creates a box called `my_number` and puts the number `10` in it.

## Quick Initialization

```panspark
SET player_score
```

Creates `player_score` with value `0` (default).

## Copying Variables

```panspark
SET 100 >> original
SET original >> copy
PRINT copy  // Shows: 100
```

## Variable Names

Choose names that make sense:
- `health`, `damage`, `score` — Good!
- `x1`, `y2`, `temp` — Also fine
- `fluffybunnies` — Works, but maybe too cute

> **⚠️ CAUTION:** Use underscores or numbers in names, but don't start with numbers: `player_1_health` works, but `1_player_health` doesn't.

---

# 📖 PAGE 4: MATH - MAKING COMPUTERS COUNT

## Basic Operations

```panspark
MATH 5 + 3 >> result       // Addition: 8
MATH 10 - 4 >> result      // Subtraction: 6
MATH 6 * 7 >> result       // Multiplication: 42
MATH 20 / 4 >> result      // Division: 5
MATH 17 % 5 >> result      // Modulo (remainder): 2
MATH 2 ** 8 >> result      // Power: 256
```

## Using Variables

```panspark
SET 10 >> health
SET 5 >> damage
MATH health - damage >> new_health
PRINT new_health  // Shows: 5
```

## Single Operations (Unary)

Sometimes you just transform a single number:

```panspark
MATH 16 sqrt >> root           // Square root: 4
MATH 100 abs >> positive       // Absolute value: 100
MATH 3.7 floor >> rounded_down // Floor: 3
MATH 3.2 ceil >> rounded_up    // Ceiling: 4
MATH 3.14159 sin >> sine_val   // Sine: ~0.0015
MATH -42 abs >> absolute       // Absolute: 42
```

## Complex Expressions

You can chain operations:

```panspark
MATH 2 + 3 * 4 >> result      // = 14 (follows order of operations)
MATH (10 + 5) * 2 >> result   // = 30
MATH 100 / 4 + 10 >> result   // = 35
```

---

# 📖 PAGE 5: PRINTING OUTPUT

## Simple Printing

```panspark
PRINT 42                   // Shows: 42
PRINT "Hello!"             // Shows: Hello!
```

## Printing Variables

```panspark
SET 100 >> score
PRINT score                // Shows: 100
```

## Printing Lists

```panspark
LIST_CREATE numbers
LIST_PUSH 1 >> numbers
LIST_PUSH 2 >> numbers
LIST_PUSH 3 >> numbers
PRINT numbers              // Shows: [1,2,3]
```

> **ℹ️ INFO:** Each `PRINT` command outputs to a buffer. When your program finishes, you can read all outputs at once. That's how PanSpark displays things!

---

# 📖 PAGE 6: CONTROL FLOW - JUMPING AROUND

## Points and Jumps

Use `POINT` to mark a location and `JUMP` to go there:

```panspark
PRINT "Starting"
JUMP skip_this
PRINT "This won't show"
POINT skip_this
PRINT "Done"
END
```

**Output:**
```
Starting
Done
```

## The IF Statement - Making Decisions

```panspark
SET 10 >> number
IF number > 5 >> big_number
PRINT "Small"
JUMP done
POINT big_number
PRINT "Big"
POINT done
END
```

**Comparison Operators:**
- `>` — Greater than
- `<` — Less than
- `==` — Equal to
- `!=` — Not equal to
- `>=` — Greater or equal
- `<=` — Less or equal

---

# 📖 PAGE 7: LOOPS - REPEATING ACTIONS

## The POINT/JUMP Loop

```panspark
SET 0 >> counter
POINT loop_start
PRINT counter
INC counter
IF counter < 5 >> loop_start
PRINT "Done!"
END
```

**Output:**
```
0
1
2
3
4
Done!
```

## FOR Loop - The Easy Way

```panspark
FOR i 0 5
  PRINT i
ENDFOR
```

**Output:**
```
0
1
2
3
4
```

> **ℹ️ INFO:** `FOR i 0 5` means "start at 0, count up to (but not including) 5". The variable `i` holds the current iteration number.

## Breaking and Continuing

```panspark
FOR i 0 10
  IF i == 5 >> skip_me
  PRINT i
  JUMP next_iteration
  POINT skip_me
  CONTINUE
  POINT next_iteration
ENDFOR
```

- `BREAK` — Exit the loop immediately
- `CONTINUE` — Skip to next iteration

---

# 📖 PAGE 8: INCREMENT AND DECREMENT

Two shortcuts for common operations:

```panspark
SET 10 >> counter
INC counter        // counter is now 11
PRINT counter
DEC counter        // counter is now 10
DEC counter        // counter is now 9
PRINT counter
END
```

**Perfect for:**
- Score counters
- Loop counters
- Health/mana bars

> **⚠️ CAUTION:** `INC` and `DEC` only work with one at a time. For multiple increments, use `MATH counter + 5 >> counter` instead.

---

# 📖 PAGE 9: PROCEDURES - REUSABLE CODE

Functions! Procedures! Subroutines! PanSpark calls them `PROC`:

```panspark
PROC greet (name)
  PRINT "Hello, "
  PRINT name
  RETURN
ENDPROC

CALL greet ("Alice") 
CALL greet ("Bob")
END
```

**Output:**
```
Hello, Alice
Hello, Bob
```

## Procedures That Return Values

```panspark
PROC double (x)
  MATH x * 2 >> result
  RETURN result
ENDPROC

CALL double (5) >> doubled
PRINT doubled  // Shows: 10
END
```

## Multiple Parameters

```panspark
PROC add (a, b)
  MATH a + b >> sum
  RETURN sum
ENDPROC

CALL add (3, 7) >> result
PRINT result  // Shows: 10
END
```

> **ℹ️ INFO:** Procedures have their own memory space. Variables created inside don't affect the outside world.

---

# 📖 PAGE 10: ADVANCED CONDITIONALS

## The NOT Operator

```panspark
SET 0 >> flag
IF NOT flag >> is_zero
PRINT "Flag is not zero"
JUMP done
POINT is_zero
PRINT "Flag is zero"
POINT done
END
```

## AND Operator

Both conditions must be true:

```panspark
SET 10 >> x
SET 20 >> y
IF x < 15 AND y > 10 >> both_true
PRINT "One or both false"
JUMP end
POINT both_true
PRINT "Both true!"
POINT end
END
```

## OR Operator

At least one condition must be true:

```panspark
SET 5 >> health
IF health == 0 OR health < 0 >> dead
PRINT "Still alive!"
JUMP end
POINT dead
PRINT "You died!"
POINT end
END
```

---

# 📖 PAGE 11: LISTS - COLLECTION OF NUMBERS

## Creating Lists

```panspark
LIST_CREATE my_scores
PRINT my_scores  // Shows: []
END
```

## Adding to Lists

```panspark
LIST_CREATE numbers
LIST_PUSH 10 >> numbers
LIST_PUSH 20 >> numbers
LIST_PUSH 30 >> numbers
PRINT numbers  // Shows: [10,20,30]
END
```

## Getting From Lists

```panspark
LIST_CREATE colors_coded
LIST_PUSH 255 >> colors_coded  // Red
LIST_PUSH 128 >> colors_coded  // Green
LIST_PUSH 0 >> colors_coded    // Blue

LIST_GET colors_coded 0 >> red_value
PRINT red_value  // Shows: 255
END
```

> **⚠️ CAUTION:** List indices start at 0! The first element is `0`, not `1`.

---

# 📖 PAGE 12: LIST OPERATIONS

## Sorting Lists

```panspark
LIST_CREATE scores
LIST_PUSH 50 >> scores
LIST_PUSH 10 >> scores
LIST_PUSH 30 >> scores

LIST_SORT scores min
PRINT scores  // Shows: [10,30,50]

LIST_SORT scores max
PRINT scores  // Shows: [50,30,10]
END
```

## List Length

```panspark
LIST_CREATE items
LIST_PUSH 1 >> items
LIST_PUSH 2 >> items

LIST_LENGTH items >> count
PRINT count  // Shows: 2
END
```

## Finding Elements

```panspark
LIST_CREATE search_list
LIST_PUSH 10 >> search_list
LIST_PUSH 20 >> search_list
LIST_PUSH 30 >> search_list

LIST_FIND search_list 20 >> position
PRINT position  // Shows: 1

LIST_CONTAINS search_list 20 >> found
PRINT found  // Shows: 1 (true)
END
```

## Removing From Lists

```panspark
LIST_CREATE to_remove
LIST_PUSH 1 >> to_remove
LIST_PUSH 2 >> to_remove
LIST_PUSH 3 >> to_remove

LIST_REMOVE to_remove 1 >> removed_value
PRINT removed_value  // Shows: 2
PRINT to_remove      // Shows: [1,3]
END
```

---

# 📖 PAGE 13: STRING OPERATIONS

## Working with Text

```panspark
SET "Hello" >> greeting
PRINT greeting  // Shows: Hello
END
```

## String Functions

```panspark
SET "hello" >> lower
STR_UPPER lower >> upper
PRINT upper  // Shows: HELLO

SET "WORLD" >> upper
STR_LOWER upper >> lower
PRINT lower  // Shows: world
END
```

## More String Operations

```panspark
SET "  spaces  " >> padded
STR_TRIM padded >> trimmed
PRINT trimmed  // Shows: spaces

SET "Hello World" >> original
STR_REPLACE original "World" "PanSpark" >> modified
PRINT modified  // Shows: Hello PanSpark

STR_CONTAINS original "World" >> has_world
PRINT has_world  // Shows: 1
END
```

---

# 📖 PAGE 14: ERROR HANDLING

## The TRY-CATCH Block

Sometimes things go wrong. Handle it gracefully:

```panspark
TRY error_msg
  MATH 10 / 0 >> oops  // This will fail!
CATCH
  PRINT "Error caught!"
  PRINT error_msg
ENDTRY
END
```

**Output:**
```
Error caught!
Division by zero error: cannot divide 10 by 0
```

## Manual Errors

You can throw your own errors:

```panspark
SET 5 >> age
TRY age_error
  IF age < 0 >> bad_age
  PRINT "Age is valid"
  JUMP age_ok
  POINT bad_age
  THROW "Age cannot be negative!"
  POINT age_ok
CATCH
  PRINT age_error
ENDTRY
END
```

> **ℹ️ INFO:** When an error happens inside a TRY block, it stores the error message in your variable and jumps to CATCH. No crash!

---

# 📖 PAGE 15: MEMORY MANAGEMENT

## Looking at Your Variables

```panspark
SET 10 >> x
SET 20 >> y
SET 30 >> z

MEMDUMP
END
```

**Output:**
```
DUMPING MEMORY at line 5
  [GLOBAL MEMORY]
    x: 10
    y: 20
    z: 30
END OF MEMORY DUMP
```

## Memory Statistics

```panspark
SET 100 >> big_number
SET "hello" >> text
LIST_CREATE items

MEMSTATS
END
```

Shows how much memory you're using.

## Freeing Memory

On systems with limited RAM, you can release variables:

```panspark
SET 1000000 >> big_temp
PRINT big_temp
FREE big_temp    // Release from memory
PRINT "Memory freed!"
END
```

> **ℹ️ INFO:** `FREE` is optional on modern systems, but vital on old computers with limited memory (like actual C64s or embedded systems).

---

# 📖 PAGE 16: TYPE CHECKING

## TYPEOF - Knowing What You Have

```panspark
SET 42 >> number
SET "hello" >> text
LIST_CREATE items

TYPEOF number >> type1
TYPEOF text >> type2
TYPEOF items >> type3

PRINT type1  // Shows: number
PRINT type2  // Shows: string
PRINT type3  // Shows: list
END
```

Perfect for debugging or handling mixed data.

---

# 📖 PAGE 17: TIMING

## TICK - Getting Elapsed Instructions

Every instruction is one "tick". You can check how many have passed:

```panspark
TICK start_tick
PRINT start_tick

PRINT "Hello"
PRINT "World"

TICK end_tick
MATH end_tick - start_tick >> elapsed
PRINT elapsed  // Shows approximately 5 (3 ticks + 2 prints)
END
```

## WAIT - Pause Execution

```panspark
PRINT "Starting"
WAIT 1000    // Wait 1000 ticks
PRINT "Done waiting"
END
```

> **ℹ️ INFO:** This is useful in timing-sensitive applications. One tick = one operation.

---

# 📖 PAGE 18: BEST PRACTICES

### ✅ DO:

1. **Initialize before using:**
   ```panspark
   SET 0 >> score  // Good!
   ```

2. **Use clear names:**
   ```panspark
   SET 100 >> player_health  // Good!
   SET 100 >> h              // Bad!
   ```

3. **Free memory when done (if limited):**
   ```panspark
   SET huge_temporary_value >> temp
   PRINT temp
   FREE temp  // Clean up!
   ```

4. **Comment complex sections:**
   ```panspark
   // Calculate player's next action based on AI
   IF enemy_health < 50 >> flee
   ```

5. **Validate bounds for lists:**
   ```panspark
   LIST_GET list 999 >> value  // Check if this index exists!
   ```

### ❌ DON'T:

1. **Use undefined variables:**
   ```panspark
   PRINT undefined_var  // ERROR!
   ```

2. **Jump outside procedures:**
   ```panspark
   PROC my_proc
     JUMP outside  // Not allowed!
   ENDPROC
   POINT outside
   ```

3. **Divide by zero:**
   ```panspark
   MATH 10 / 0 >> result  // Crash!
   ```

4. **Access invalid list indices:**
   ```panspark
   LIST_CREATE list
   LIST_PUSH 1 >> list
   LIST_GET list 5 >> value  // Out of bounds!
   ```

---

# 📖 PAGE 19: COMMON PATTERNS

## Pattern 1: Counter Loop

```panspark
SET 0 >> i
POINT loop
PRINT i
INC i
IF i < 10 >> loop
END
```

## Pattern 2: Accumulator

```panspark
SET 0 >> total
FOR i 1 10
  MATH total + i >> total
ENDFOR
PRINT total  // Sum of 1-9: 45
END
```

## Pattern 3: Nested Loops

```panspark
FOR row 0 3
  FOR col 0 3
    PRINT "."
  ENDFOR
  PRINT "\n"
ENDFOR
END
```

## Pattern 4: Safe Division

```panspark
SET 0 >> divisor
TRY error
  MATH 100 / divisor >> result
CATCH
  SET -1 >> result
ENDTRY
PRINT result
END
```

---

# 📖 PAGE 20: DEBUGGING TIPS

### Finding Problems

1. **Use MEMDUMP to see what's stored:**
   ```panspark
   MEMDUMP  // Shows all variables
   ```

2. **Print intermediate values:**
   ```panspark
   SET 10 >> x
   SET 20 >> y
   PRINT x  // Check x
   MATH x + y >> z
   PRINT z  // Check result
   ```

3. **Use TYPEOF to verify types:**
   ```panspark
   TYPEOF suspect_var >> type
   PRINT type
   ```

4. **Trace your jumps:**
   ```panspark
   PRINT "Before jump"
   JUMP target
   PRINT "Never printed"
   POINT target
   PRINT "After jump"
   ```

5. **Test procedures in isolation:**
   ```panspark
   PROC broken_thing (x)
     PRINT x
     MATH x * 2 >> result
     RETURN result
   ENDPROC
   
   CALL broken_thing (5) >> test
   PRINT test
   ```

---

# 📖 PAGE 21: COMPLETE EXAMPLE - GUESS THE NUMBER

```panspark
PROC get_guess (min, max)
  // In real code, you'd get input somehow
  SET 42 >> guess
  RETURN guess
ENDPROC

PROC check_guess (secret, guess)
  IF guess == secret >> correct
  IF guess > secret >> too_high
  PRINT "Too low!"
  RETURN 0
  JUMP done
  
  POINT too_high
  PRINT "Too high!"
  RETURN 0
  JUMP done
  
  POINT correct
  PRINT "Correct!"
  RETURN 1
  
  POINT done
  RETURN 0
ENDPROC

// Main game
SET 42 >> secret_number
SET 0 >> won

POINT game_loop
IF won == 1 >> game_end

CALL get_guess (1, 100) >> player_guess
CALL check_guess (secret_number, player_guess) >> is_correct

SET is_correct >> won
JUMP game_loop

POINT game_end
PRINT "Game over!"
END
```

---

# 📖 PAGE 22: ADVANCED TECHNIQUES

## Recursive Procedures

```panspark
PROC factorial (n)
  IF n <= 1 >> base
  MATH n - 1 >> n_minus_1
  CALL factorial (n_minus_1) >> sub_result
  MATH n * sub_result >> final
  RETURN final
  
  POINT base
  RETURN 1
ENDPROC

CALL factorial (5) >> result
PRINT result  // Shows: 120
END
```

## State Machines

```panspark
SET 0 >> state  // 0=idle, 1=active, 2=done

POINT state_machine
PRINT state

IF state == 0 >> state_idle
IF state == 1 >> state_active
IF state == 2 >> state_done
JUMP state_machine

POINT state_idle
SET 1 >> state
JUMP state_machine

POINT state_active
SET 2 >> state
JUMP state_machine

POINT state_done
PRINT "Complete!"
END
```

---

# 📖 PAGE 23: QUICK REFERENCE TABLE

| OpCode | Does | Example |
|--------|------|---------|
| SET | Store a value | `SET 10 >> x` |
| MATH | Calculate | `MATH x + y >> z` |
| PRINT | Display output | `PRINT result` |
| IF | Conditional jump | `IF x > 5 >> label` |
| JUMP | Unconditional jump | `JUMP label` |
| POINT | Mark location | `POINT label` |
| FOR...ENDFOR | Count loop | `FOR i 0 10` |
| INC | Add 1 | `INC counter` |
| DEC | Subtract 1 | `DEC counter` |
| PROC...ENDPROC | Define function | `PROC add (a, b)` |
| CALL | Run function | `CALL add (3, 5) >> result` |
| RETURN | Exit function | `RETURN result` |
| LIST_CREATE | New list | `LIST_CREATE items` |
| LIST_PUSH | Add to list | `LIST_PUSH 10 >> items` |
| LIST_GET | Get from list | `LIST_GET items 0 >> first` |
| LIST_SORT | Sort list | `LIST_SORT items min` |
| FREE | Delete variable | `FREE temp` |
| TRY...CATCH | Error handling | `TRY error` |
| MEMDUMP | Show memory | `MEMDUMP` |
| END | Stop program | `END` |

---

# 📖 PAGE 24: QUICK REFERENCE - MATH OPERATORS

| Operator | Use | Example |
|----------|-----|---------|
| `+` | Add | `MATH 5 + 3 >> result` |
| `-` | Subtract | `MATH 10 - 4 >> result` |
| `*` | Multiply | `MATH 6 * 7 >> result` |
| `/` | Divide | `MATH 20 / 4 >> result` |
| `%` | Modulo/Remainder | `MATH 17 % 5 >> result` |
| `**` | Power | `MATH 2 ** 3 >> result` |
| `sqrt` | Square root | `MATH 16 sqrt >> result` |
| `abs` | Absolute value | `MATH -42 abs >> result` |
| `floor` | Round down | `MATH 3.7 floor >> result` |
| `ceil` | Round up | `MATH 3.2 ceil >> result` |
| `round` | Round nearest | `MATH 3.5 round >> result` |
| `sin` | Sine | `MATH 3.14 sin >> result` |
| `cos` | Cosine | `MATH 3.14 cos >> result` |
| `tan` | Tangent | `MATH 3.14 tan >> result` |
| `rand` | Random | `MATH 100 rand >> result` |

---

# 📖 PAGE 25: QUICK REFERENCE - COMPARISON OPERATORS

| Operator | Means | Example |
|----------|-------|---------|
| `>` | Greater than | `IF x > 10 >> label` |
| `<` | Less than | `IF x < 10 >> label` |
| `==` | Equal to | `IF x == 10 >> label` |
| `!=` | Not equal | `IF x != 10 >> label` |
| `>=` | Greater or equal | `IF x >= 10 >> label` |
| `<=` | Less or equal | `IF x <= 10 >> label` |
| `AND` | Both true | `IF a > 5 AND b < 10 >> label` |
| `OR` | Either true | `IF a > 5 OR b < 10 >> label` |
| `NOT` | Negate | `IF NOT flag >> label` |

---

# 📖 PAGE 26: TROUBLESHOOTING

### "Variable is not defined"
**Problem:** You used a variable before creating it.
```panspark
PRINT undefined  // ERROR!
```
**Solution:** Always SET first.
```panspark
SET 0 >> variable
PRINT variable  // OK!
```

### "Jump target not found"
**Problem:** You jumped to a POINT that doesn't exist.
```panspark
JUMP missing_label  // ERROR! No POINT missing_label
```
**Solution:** Define the POINT first.
```panspark
POINT missing_label
PRINT "Found it!"
```

### "Out of bounds"
**Problem:** You accessed a list index that doesn't exist.
```panspark
LIST_CREATE items
LIST_PUSH 1 >> items
LIST_GET items 5 >> value  // ERROR! Only index 0 exists
```
**Solution:** Check bounds or use LIST_LENGTH first.

### "Type mismatch"
**Problem:** You used the wrong type of data.
```panspark
LIST_CREATE items
MATH items + 5 >> result  // ERROR! Can't do math on a list
```
**Solution:** Make sure you're using the right variable type.

---

# 📖 PAGE 27: MEMORY MANAGEMENT ON LIMITED SYSTEMS

If you're running on a C64, old embedded system, or memory-constrained device:

### Check Your Memory

```panspark
MEMSTATS  // See how much you're using
```

### Be Aggressive with FREE

```panspark
SET 1000 >> temporary
PRINT temporary
FREE temporary  // Free it right after use!
```

### Use Lists Wisely

```panspark
// Big lists use more memory
LIST_CREATE huge_list
FOR i 0 10000
  LIST_PUSH i >> huge_list
ENDFOR

// Consider alternatives:
// - Process and throw away instead of storing
// - Use smaller batches
```

### Reuse Variables

```panspark
SET 0 >> value
POINT loop
  MATH value + 1 >> value
  IF value < 100 >> loop

// Reuse 'value' for something else
SET 0 >> value  // Reset and reuse
```

---

# 📖 PAGE 28: PERFORMANCE TIPS

PanSpark is FAST, but here are ways to make it faster:

### 1. Use FOR loops instead of POINT/JUMP
```panspark
// ✅ Better (FOR is optimized)
FOR i 0 1000
  PRINT i
ENDFOR

// ⚠️ Slower (manual loop)
SET 0 >> i
POINT loop
PRINT i
INC i
IF i < 1000 >> loop
```

### 2. Use procedures for repeated code
```panspark
// ✅ Better (procedure)
PROC calculate_damage (base, modifier)
  MATH base * modifier >> result
  RETURN result
ENDPROC

CALL calculate_damage (10, 2) >> dmg1
CALL calculate_damage (15, 3) >> dmg2
```

### 3. Minimize nested loops
```panspark
// ⚠️ Slower (O(n²))
FOR i 0 100
  FOR j 0 100
    // 10,000 operations
  ENDFOR
ENDFOR
```

---

# 📖 PAGE 29: REAL-WORLD EXAMPLE - INVENTORY SYSTEM

```panspark
LIST_CREATE inventory
SET 0 >> gold

PROC add_item (item_id, quantity)
  LIST_PUSH item_id >> inventory
  RETURN
ENDPROC

PROC add_gold (amount)
  LIST_PUSH amount >> inventory
  RETURN
ENDPROC

PROC show_inventory ()
  PRINT "=== INVENTORY ==="
  LIST_LENGTH inventory >> length
  
  FOR i 0 length
    LIST_GET inventory i >> item
    PRINT item
  ENDFOR
  
  RETURN
ENDPROC

// Use it
CALL add_item (1) // sword
CALL add_item (2) // shield
CALL add_gold (50)
CALL show_inventory ()

END
```

---

# 📖 PAGE 30: FINAL WORDS

### Welcome to the PanSpark Community

You've now got the knowledge to:
- ✅ Create variables and do math
- ✅ Make decisions with IF statements
- ✅ Loop and repeat
- ✅ Build functions with PROC
- ✅ Handle errors gracefully
- ✅ Manage memory
- ✅ Debug when things go wrong

### Remember:
- **One operation per line** keeps things clear
- **Comments** are your friend
- **Test often** and debug methodically
- **Reuse code** with procedures
- **Manage memory** on constrained systems

### Next Steps:
1. Write a simple game
2. Build a calculator
3. Create a data organizer
4. Optimize for performance
5. Share your code!

---

```
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║                      YOU ARE NOW A                                 ║
║                     PANSPARK PROGRAMMER!                           ║
║                                                                    ║
║          May your variables be defined and your loops fast.       ║
║                                                                    ║
║                  "One operation per line, sir."                    ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

**Last Updated:** November 2025
**PanSpark Version:** Latest
**Manual Style:** Retro C64-inspired, but modern and accessible
**Target Audience:** Everyone from kids to experienced programmers

---

**Questions? Issues? Want to contribute?**
Report at: https://github.com/sst/opencode
