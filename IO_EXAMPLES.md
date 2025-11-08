# PanSpark Hardware IO Examples

Complete working examples for common automation scenarios.

## Example 1: Simple LED Blinker

The classic "Hello World" of embedded systems.

### PanSpark Code
```panspark
// Simple LED Blinker
PIN_MODE 13 OUTPUT

SET 0 >> count

POINT blink_loop
IF count >= 10 >> done

DIGITAL_WRITE 13 HIGH
PRINT "LED ON"
WAIT 500

DIGITAL_WRITE 13 LOW
PRINT "LED OFF"
WAIT 500

INC count
JUMP blink_loop

POINT done
PRINT "Blinking complete"
END
```

### What It Does
- Configures pin 13 as output
- Blinks LED 10 times
- 500ms on, 500ms off
- Outputs status to Serial

### Hardware Setup
```
Pin 13 ──[330Ω]──[LED (long)]──GND
                    (short leg)
```

---

## Example 2: Button Counter

Count button presses with debouncing.

### PanSpark Code
```panspark
// Button Press Counter with Debounce
PIN_MODE 2 INPUT      // Button on pin 2
PIN_MODE 13 OUTPUT    // LED feedback on pin 13
SET 0 >> presses
SET 0 >> lastState
SET 0 >> debounceCounter

POINT main_loop
DIGITAL_READ 2 >> buttonState
PRINT "Button state: "
PRINT buttonState

// Debounce logic
IF buttonState == lastState >> check_press
SET 20 >> debounceCounter
JUMP update_state

POINT check_press
IF debounceCounter > 0 >> wait_debounce
IF buttonState == 1 >> increment

JUMP update_state

POINT wait_debounce
DEC debounceCounter
JUMP update_state

POINT increment
INC presses
PRINT "Presses: "
PRINT presses

// Blink LED on press
DIGITAL_WRITE 13 HIGH
WAIT 100
DIGITAL_WRITE 13 LOW

POINT update_state
SET buttonState >> lastState
WAIT 50
JUMP main_loop
```

### Hardware Setup
```
GND ──[Button]──+── Pin 2
                |
                └──[10kΩ]──5V (pull-up)

Pin 13 ──[330Ω]──[LED]──GND
```

---

## Example 3: PWM LED Brightness Control

Fade LED brightness using PWM.

### PanSpark Code
```panspark
// PWM LED Fade In/Out
PIN_MODE 9 OUTPUT  // PWM pin 9
SET 0 >> brightness
SET 1 >> direction  // 1 = fade in, -1 = fade out

POINT fade_loop

// Apply current brightness
ANALOG_WRITE 9 brightness
PRINT "Brightness: "
PRINT brightness

// Check direction
IF direction == 1 >> fade_in
JUMP fade_out

POINT fade_in
INC brightness
INC brightness  // Faster increase
IF brightness < 255 >> fade_loop
SET -1 >> direction
JUMP fade_loop

POINT fade_out
DEC brightness
DEC brightness  // Faster decrease
IF brightness > 0 >> fade_loop
SET 1 >> direction
JUMP fade_loop
```

### Hardware Setup
```
Pin 9 ──[1kΩ]──[LED (long)]──GND
                 (short leg)
```

### Generated Arduino Code
```cpp
analogWrite(9, brightness);
```

---

## Example 4: Temperature Sensor Monitoring

Read analog temperature sensor and control LED.

### PanSpark Code
```panspark
// Temperature Monitoring with LED Indicator
PIN_MODE 0 INPUT    // Analog temperature sensor on A0
PIN_MODE 9 OUTPUT   // Status LED on pin 9

SET 0 >> reading
SET 0 >> avgTemp
SET 0 >> samples

POINT read_loop

// Take 10 samples for averaging
SET 0 >> samples
SET 0 >> sum

POINT sample_loop
ANALOG_READ 0 >> reading
PRINT "Raw reading: "
PRINT reading

MATH sum + reading >> sum
INC samples
IF samples < 10 >> sample_loop

MATH sum / 10 >> avgTemp
PRINT "Average temp: "
PRINT avgTemp

// LED control based on temperature
IF avgTemp < 200 >> temp_cold
IF avgTemp < 400 >> temp_cool
IF avgTemp < 600 >> temp_warm
// Hot
ANALOG_WRITE 9 255
PRINT "Status: HOT"
JUMP continue_monitoring

POINT temp_warm
ANALOG_WRITE 9 200
PRINT "Status: WARM"
JUMP continue_monitoring

POINT temp_cool
ANALOG_WRITE 9 100
PRINT "Status: COOL"
JUMP continue_monitoring

POINT temp_cold
ANALOG_WRITE 9 50
PRINT "Status: COLD"

POINT continue_monitoring
WAIT 1000  // Sample every second
JUMP read_loop
```

---

## Example 5: Motion-Activated Light

Automatically control light based on motion sensor.

### PanSpark Code
```panspark
// Motion-Activated Light System
PIN_MODE 2 INPUT    // Motion sensor on pin 2
PIN_MODE 3 OUTPUT   // Light controller on pin 3

SET 0 >> motionDetected
SET 0 >> lightBrightness
SET 0 >> timeoutCounter

POINT motion_loop

// Read motion sensor
DIGITAL_READ 2 >> motionDetected
PRINT "Motion: "
PRINT motionDetected

IF motionDetected == 0 >> light_timeout

// Motion detected - turn on at full brightness
SET 255 >> lightBrightness
SET 100 >> timeoutCounter  // 10 seconds timeout (100 * 100ms)
PRINT "MOTION DETECTED - Light ON"
JUMP apply_light

POINT light_timeout
// No motion - start countdown
IF timeoutCounter <= 0 >> light_off

DEC timeoutCounter
PRINT "Timeout in: "
PRINT timeoutCounter
JUMP apply_light

POINT light_off
SET 0 >> lightBrightness
PRINT "Light OFF"

POINT apply_light
ANALOG_WRITE 3 lightBrightness
WAIT 100  // Update every 100ms
JUMP motion_loop
```

### Hardware Setup
```
Motion Sensor + Pin 2 (digital)
GND Pin 3 ──[1kΩ]──[Light Controller/Relay]──12V Power

Alternative with LED:
Pin 3 ──[330Ω]──[LED]──GND
```

---

## Example 6: Multi-Button Menu System

Control system with multiple buttons.

### PanSpark Code
```panspark
// 3-Button Menu System
PIN_MODE 2 INPUT    // Button 1 - UP
PIN_MODE 3 INPUT    // Button 2 - SELECT
PIN_MODE 4 INPUT    // Button 3 - DOWN
PIN_MODE 13 OUTPUT  // Status LED

SET 0 >> menuItem
SET 0 >> maxItems
SET 3 >> maxItems

POINT menu_loop

// Read all buttons
DIGITAL_READ 2 >> buttonUp
DIGITAL_READ 3 >> buttonSel
DIGITAL_READ 4 >> buttonDown

// Handle UP button
IF buttonUp == 0 >> check_select
DEC menuItem
IF menuItem < 0 >> check_select
SET 0 >> menuItem

POINT check_select
IF buttonSel == 0 >> check_down
PRINT "Selected menu item: "
PRINT menuItem

// Flash LED for confirmation
DIGITAL_WRITE 13 HIGH
WAIT 200
DIGITAL_WRITE 13 LOW
WAIT 200

JUMP menu_display

POINT check_down
IF buttonDown == 0 >> menu_display
INC menuItem
IF menuItem >= maxItems >> wrap_around
JUMP menu_display

POINT wrap_around
SET 0 >> menuItem

POINT menu_display
PRINT "Menu item: "
PRINT menuItem
WAIT 100
JUMP menu_loop
```

---

## Example 7: Data Logging with Serial Output

Collect sensor data at regular intervals.

### PanSpark Code
```panspark
// Data Logging System
PIN_MODE 0 INPUT    // Temperature sensor
PIN_MODE 1 INPUT    // Humidity sensor
SET 0 >> logCount
SET 100 >> maxLogs

POINT logging_loop
IF logCount >= maxLogs >> done_logging

// Read sensors
ANALOG_READ 0 >> temperature
ANALOG_READ 1 >> humidity

// Calculate averages (simplified)
MATH temperature / 4 >> tempC
MATH humidity / 4 >> humidityPct

// Output data
PRINT "LOG "
PRINT logCount
PRINT ": Temp="
PRINT tempC
PRINT "C Humidity="
PRINT humidityPct
PRINT "%"

INC logCount
WAIT 5000  // Log every 5 seconds

JUMP logging_loop

POINT done_logging
PRINT "Logging complete"
PRINT "Total samples: "
PRINT logCount
END
```

---

## Example 8: PWM Motor Speed Control

Control DC motor speed with potentiometer.

### PanSpark Code
```panspark
// DC Motor Speed Controller
PIN_MODE 0 INPUT    // Potentiometer on A0
PIN_MODE 9 OUTPUT   // Motor control on PWM pin 9

SET 0 >> potValue
SET 0 >> motorSpeed

POINT motor_loop

// Read potentiometer (0-1023)
ANALOG_READ 0 >> potValue
PRINT "Pot value: "
PRINT potValue

// Convert to PWM range (0-255)
MATH potValue / 4 >> motorSpeed

// Apply to motor
ANALOG_WRITE 9 motorSpeed
PRINT "Motor speed: "
PRINT motorSpeed

WAIT 100
JUMP motor_loop
```

### Hardware Setup
```
Potentiometer Setup:
    5V ──[Potentiometer]──GND
           │
           └──A0 (analog input)

Motor Setup:
    Pin 9 ──[MOSfet/Transistor]──Motor+
                   │
    Motor- ───────────

    GND ──[Motor-]──GND
```

---

## Example 9: Alarm System

Temperature alarm with LED and buzzer feedback.

### PanSpark Code
```panspark
// Temperature Alarm System
PIN_MODE 0 INPUT    // Temperature sensor (A0)
PIN_MODE 13 OUTPUT  // Alarm LED
PIN_MODE 11 OUTPUT  // Buzzer (PWM)

SET 300 >> tempThreshold
SET 0 >> isAlarming

POINT alarm_loop

// Read temperature
ANALOG_READ 0 >> tempReading
PRINT "Temperature: "
PRINT tempReading

// Check alarm condition
IF tempReading < tempThreshold >> alarm_off

// TEMPERATURE TOO HIGH - ALARM!
SET 1 >> isAlarming
PRINT "ALARM: Temperature too high!"

// Fast blink LED
DIGITAL_WRITE 13 HIGH
// Pulse buzzer
ANALOG_WRITE 11 200
WAIT 200

DIGITAL_WRITE 13 LOW
ANALOG_WRITE 11 0
WAIT 200

JUMP alarm_loop

POINT alarm_off
IF isAlarming == 0 >> normal_operation
PRINT "Alarm cleared"
SET 0 >> isAlarming

POINT normal_operation
DIGITAL_WRITE 13 LOW
ANALOG_WRITE 11 0
WAIT 1000
JUMP alarm_loop
```

---

## Example 10: Smart Thermostat

Maintain temperature within target range.

### PanSpark Code
```panspark
// Smart Thermostat
PIN_MODE 0 INPUT    // Temperature sensor
PIN_MODE 5 OUTPUT   // Heater relay
PIN_MODE 6 OUTPUT   // Cooler relay
PIN_MODE 13 OUTPUT  // Status indicator

SET 500 >> targetTemp  // Target temperature reading
SET 50 >> tolerance    // ±50 points tolerance
SET 0 >> heaterOn
SET 0 >> coolerOn

POINT thermostat_loop

// Read current temperature
ANALOG_READ 0 >> currentTemp
PRINT "Current: "
PRINT currentTemp
PRINT " Target: "
PRINT targetTemp

// Calculate temp bounds
MATH targetTemp - tolerance >> lowerBound
MATH targetTemp + tolerance >> upperBound

// Check temperature and activate heater/cooler
IF currentTemp > upperBound >> too_hot
IF currentTemp < lowerBound >> too_cold

// Temperature is OK
POINT temperature_ok
DIGITAL_WRITE 5 LOW  // Off heater
DIGITAL_WRITE 6 LOW  // Off cooler
DIGITAL_WRITE 13 LOW
PRINT "Status: OK"
JUMP continue_loop

POINT too_hot
DIGITAL_WRITE 5 LOW   // Off heater
DIGITAL_WRITE 6 HIGH  // On cooler
DIGITAL_WRITE 13 HIGH
PRINT "Status: COOLING"
JUMP continue_loop

POINT too_cold
DIGITAL_WRITE 5 HIGH  // On heater
DIGITAL_WRITE 6 LOW   // Off cooler
DIGITAL_WRITE 13 HIGH
PRINT "Status: HEATING"

POINT continue_loop
WAIT 2000  // Check every 2 seconds
JUMP thermostat_loop
```

---

## Compiling Examples to Arduino

Each example can be transpiled to Arduino code:

```typescript
import { PanSparkVM } from "./panspark";

const vm = new PanSparkVM();
const pansparkCode = `
PIN_MODE 13 OUTPUT
DIGITAL_WRITE 13 HIGH
WAIT 1000
DIGITAL_WRITE 13 LOW
END
`;

const arduinoCode = vm.transpileToArduino(pansparkCode);
console.log(arduinoCode);
```

Then copy the generated code to Arduino IDE and upload!

---

## Testing Without Hardware

All examples can run in the PanSpark runtime for testing:

```typescript
const vm = new PanSparkVM();
const instructions = vm.compile(pansparkCode);
const program = vm.run(instructions);

// Step through execution
while (!program.next().done) {
  // Execution step
}

// Check output
vm.buffer.forEach(line => console.log(line));
```

---

## Tips and Best Practices

1. **Always call PIN_MODE first**: Configure pins before using them
2. **Use meaningful variable names**: Makes code more readable
3. **Add WAIT between rapid operations**: Prevents overwhelming the controller
4. **Test in simulator first**: Verify logic before deploying to hardware
5. **Use MEMDUMP for debugging**: Check variable states during execution
6. **Add status messages with PRINT**: Helps with troubleshooting
7. **Consider power consumption**: Some sensors/actuators draw significant current
8. **Use pull-up resistors**: For digital inputs to avoid floating states

