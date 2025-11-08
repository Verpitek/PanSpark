import { PanSparkVM } from "./panspark";

const vm = new PanSparkVM();

const pansparkCode = `
// LED Blinky Example - Blink LED 10 times with 500ms intervals
// Hardware: LED connected to pin 13 with 330Ω resistor to GND

// Configure pin 13 as output (built-in LED on most Arduino boards)
PIN_MODE 13 OUTPUT

// Initialize counter
SET 0 >> count
SET 10 >> maxBlinks

PRINT "Starting LED blink sequence"

// Blink loop
POINT blink_loop
IF count >= maxBlinks >> done_blinking

// Turn LED ON
DIGITAL_WRITE 13 HIGH
PRINT "LED ON"
WAIT 500

// Turn LED OFF
DIGITAL_WRITE 13 LOW
PRINT "LED OFF"
WAIT 500

// Increment counter
INC count
PRINT "Blink: "
PRINT count

// Jump back to loop
JUMP blink_loop

// Done
POINT done_blinking
PRINT "Blinking complete!"
PRINT "Total blinks: "
PRINT count

END
`;

// Compile the code
console.log("=== COMPILING PANSPARK CODE ===\n");
const instructions = vm.compile(pansparkCode);
console.log(`Compiled ${instructions.length} instructions\n`);

// Transpile to Arduino
console.log("=== TRANSPILING TO ARDUINO C++ ===\n");
const arduinoCode = vm.transpileToArduino(pansparkCode);
console.log(arduinoCode);

console.log("\n=== PANSPARK RUNTIME OUTPUT ===\n");
// Run in PanSpark simulator
const program = vm.run(instructions);
while (!program.next().done) {
  // Execution continues
}

// Show all output
console.log("=== EXECUTION BUFFER ===\n");
vm.buffer.forEach((line) => console.log(line));
