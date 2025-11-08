# PanSpark Hardware IO Opcodes

PanSpark now supports direct hardware I/O operations for automation and IoT applications. These opcodes follow the same simple syntax as the rest of the language.

## Table of Contents
1. [PIN_MODE](#pin_mode) - Configure pin direction
2. [DIGITAL_WRITE](#digital_write) - Output HIGH/LOW to pin
3. [DIGITAL_READ](#digital_read) - Read digital input from pin
4. [ANALOG_WRITE](#analog_write) - PWM output (0-255)
5. [ANALOG_READ](#analog_read) - Read analog input (0-1023)

---

## PIN_MODE

Configure a pin as INPUT or OUTPUT before using it.

### Syntax
```panspark
PIN_MODE pin INPUT|OUTPUT
```

### Parameters
- **pin**: Pin number (0-13 for most Arduino boards)
- **mode**: `INPUT` or `OUTPUT` (can be variable or literal)

### Examples

```panspark
// Set pin 13 as output (LED)
PIN_MODE 13 OUTPUT

// Set pin 2 as input (button)
PIN_MODE 2 INPUT

// Set pin from variable
SET 7 >> ledPin
PIN_MODE ledPin OUTPUT
```

### Arduino Transpiler Output
```cpp
pinMode(13, OUTPUT);
pinMode(2, INPUT);
pinMode(ledPin, OUTPUT);
```

---

## DIGITAL_WRITE

Set a digital pin to HIGH or LOW (5V or 0V).

### Syntax
```panspark
DIGITAL_WRITE pin HIGH|LOW
```

### Parameters
- **pin**: Pin number (must be configured as OUTPUT with PIN_MODE first)
- **value**: `HIGH` (5V) or `LOW` (0V), or variable containing 0/1

### Examples

```panspark
// Blink an LED on pin 13
PIN_MODE 13 OUTPUT
DIGITAL_WRITE 13 HIGH
WAIT 1000
DIGITAL_WRITE 13 LOW

// Using variables
SET 1 >> ledState
DIGITAL_WRITE 13 ledState

// Toggle based on condition
SET 5 >> brightness
IF brightness > 100 >> bright
DIGITAL_WRITE 9 LOW
JUMP done

POINT bright
DIGITAL_WRITE 9 HIGH

POINT done
```

### Arduino Transpiler Output
```cpp
digitalWrite(13, HIGH);
digitalWrite(13, LOW);
digitalWrite(13, ledState);
```

### Real-World Use Case: LED Control
```panspark
// Simple LED blinker
PIN_MODE 13 OUTPUT
SET 0 >> count

POINT blink_loop
IF count < 10 >> continue_blink
END

POINT continue_blink
DIGITAL_WRITE 13 HIGH
WAIT 500
DIGITAL_WRITE 13 LOW
WAIT 500
INC count
JUMP blink_loop
```

---

## DIGITAL_READ

Read the digital state of a pin (HIGH=1 or LOW=0).

### Syntax
```panspark
DIGITAL_READ pin >> result
```

### Parameters
- **pin**: Pin number (must be configured as INPUT with PIN_MODE first)
- **result**: Variable to store the value (0 for LOW, 1 for HIGH)

### Examples

```panspark
// Read button state
PIN_MODE 2 INPUT
DIGITAL_READ 2 >> buttonPressed

// Check if button is pressed
IF buttonPressed == 1 >> button_pressed_handler
PRINT "Button not pressed"
JUMP skip_handler

POINT button_pressed_handler
PRINT "Button pressed!"

POINT skip_handler

// Using in loop
SET 0 >> buttonCount
POINT read_loop
DIGITAL_READ 3 >> state
IF state == 1 >> increment_count
JUMP continue_reading

POINT increment_count
INC buttonCount

POINT continue_reading
IF buttonCount < 100 >> read_loop
PRINT "Button pressed 100 times"
```

### Arduino Transpiler Output
```cpp
setVariable("buttonPressed", digitalRead(2));
```

### Real-World Use Case: Button Debounce Counter
```panspark
// Count button presses with debouncing
PIN_MODE 2 INPUT
SET 0 >> presses
SET 0 >> lastState
SET 0 >> debounce

POINT monitor_button
DIGITAL_READ 2 >> currentState

// Debounce logic
IF currentState == lastState >> skip_debounce
SET 10 >> debounce
JUMP check_state

POINT skip_debounce
IF debounce > 0 >> dec_debounce
JUMP check_state

POINT dec_debounce
DEC debounce
JUMP check_state

// Count on transition
POINT check_state
IF lastState == 0 >> check_high
JUMP continue_check

POINT check_high
IF currentState == 1 >> count_press
JUMP continue_check

POINT count_press
INC presses
PRINT presses

POINT continue_check
SET currentState >> lastState
WAIT 50
JUMP monitor_button
```

---

## ANALOG_WRITE

Output a PWM (Pulse Width Modulation) signal for analog control (brightness, speed, etc).

### Syntax
```panspark
ANALOG_WRITE pin value
```

### Parameters
- **pin**: PWM-capable pin (3, 5, 6, 9, 10, 11 on most Arduino boards)
- **value**: 0-255 (0=off, 255=full power) or 0.0-1.0 (0%=off, 100%=full)

### Examples

```panspark
// Control LED brightness
PIN_MODE 9 OUTPUT

// Set to 50% brightness (PWM value 128)
ANALOG_WRITE 9 128

// Fade in effect
SET 0 >> brightness
POINT fade_in_loop
ANALOG_WRITE 9 brightness
INC brightness
IF brightness < 255 >> fade_in_loop

PRINT "LED at full brightness"

// Using percentage (0.0-1.0)
SET 0.5 >> percent
MATH percent * 255 >> pwmValue
ANALOG_WRITE 9 pwmValue

// Motor speed control
SET 5 >> motorSpeed
ANALOG_WRITE 10 motorSpeed  // 5/255 ≈ 2% speed
```

### Arduino Transpiler Output
```cpp
analogWrite(9, 128);
analogWrite(9, brightness);
analogWrite(10, motorSpeed);
```

### Real-World Use Case: LED Fade In/Out
```panspark
// Smooth LED fade in and out
PIN_MODE 3 OUTPUT
SET 0 >> brightness
SET 0 >> direction  // 1 = increasing, -1 = decreasing

POINT fade_loop
ANALOG_WRITE 3 brightness

// Increase brightness
IF direction == 1 >> check_max
JUMP check_min

POINT check_max
IF brightness >= 255 >> start_fade_out
INC brightness
INC brightness  // Faster increment
JUMP fade_loop

POINT start_fade_out
SET -1 >> direction
JUMP fade_loop

// Decrease brightness
POINT check_min
IF brightness <= 0 >> start_fade_in
DEC brightness
DEC brightness  // Faster decrement
JUMP fade_loop

POINT start_fade_in
SET 1 >> direction
JUMP fade_loop
```

---

## ANALOG_READ

Read an analog input value from an analog pin (0-1023 for 10-bit ADC).

### Syntax
```panspark
ANALOG_READ pin >> result
```

### Parameters
- **pin**: Analog pin (A0-A5 or 0-5 on most Arduino boards)
- **result**: Variable to store the value (0-1023)

### Examples

```panspark
// Read analog sensor
ANALOG_READ 0 >> sensorValue
PRINT sensorValue

// Read temperature sensor and adjust LED
ANALOG_READ 1 >> temperature

// Set LED brightness based on sensor
IF temperature < 256 >> low_temp
IF temperature < 512 >> mid_temp
ANALOG_WRITE 9 255
JUMP temp_done

POINT mid_temp
ANALOG_WRITE 9 200
JUMP temp_done

POINT low_temp
ANALOG_WRITE 9 100

POINT temp_done

// Average multiple readings
SET 0 >> sum
SET 0 >> i
POINT read_loop
ANALOG_READ 2 >> reading
MATH sum + reading >> sum
INC i
IF i < 10 >> read_loop

MATH sum / 10 >> average
PRINT average
```

### Arduino Transpiler Output
```cpp
setVariable("sensorValue", analogRead(0));
```

### Real-World Use Case: Light Sensor with Auto-Brightness
```panspark
// Auto-adjust LED brightness based on light sensor
PIN_MODE 5 OUTPUT
SET 0 >> ambient

POINT sensor_loop
// Read light level (0-1023)
ANALOG_READ 0 >> lightLevel

// Map light level to LED brightness
IF lightLevel < 256 >> dark
IF lightLevel < 512 >> dim
IF lightLevel < 768 >> medium
// Bright
ANALOG_WRITE 5 50
JUMP wait_and_loop

POINT medium
ANALOG_WRITE 5 100
JUMP wait_and_loop

POINT dim
ANALOG_WRITE 5 200
JUMP wait_and_loop

POINT dark
ANALOG_WRITE 5 255

POINT wait_and_loop
WAIT 1000  // Update every 1 second
JUMP sensor_loop
```

---

## Complete Automation Example: Smart Light System

```panspark
// Smart light controller
// - Turns on/off based on motion sensor
// - Adjusts brightness based on time of day (simulated by light sensor)

// Initialize pins
PIN_MODE 2 INPUT    // Motion sensor
PIN_MODE 9 OUTPUT   // LED brightness control
PIN_MODE 0 INPUT    // Light level sensor (analog)

SET 0 >> motionDetected
SET 0 >> currentBrightness
SET 150 >> targetBrightness

POINT main_loop

// Read sensors
DIGITAL_READ 2 >> motionDetected
ANALOG_READ 0 >> lightLevel

// Motion detected - turn on light
IF motionDetected == 0 >> no_motion
PRINT "Motion detected!"
SET 200 >> targetBrightness
JUMP adjust_brightness

// No motion - dim light
POINT no_motion
PRINT "No motion"
SET 50 >> targetBrightness

// Adjust brightness smoothly
POINT adjust_brightness
IF currentBrightness == targetBrightness >> brightness_ok
IF currentBrightness < targetBrightness >> increase_brightness

// Decrease brightness
DEC currentBrightness
JUMP apply_brightness

POINT increase_brightness
INC currentBrightness

POINT apply_brightness
ANALOG_WRITE 9 currentBrightness
PRINT "Brightness: "
PRINT currentBrightness

POINT brightness_ok
WAIT 100  // Update every 100ms
JUMP main_loop
```

---

## Pin Reference for Common Arduino Boards

### Arduino Uno
- **Digital I/O**: 0-13 (0,1 = Serial)
- **PWM pins**: 3, 5, 6, 9, 10, 11
- **Analog Input**: A0-A5

### Arduino Nano
- **Digital I/O**: 0-13
- **PWM pins**: 3, 5, 6, 9, 10, 11
- **Analog Input**: A0-A7

### Arduino Mega
- **Digital I/O**: 0-53
- **PWM pins**: 2-13, 44-46
- **Analog Input**: A0-A15

---

## Integration with Other Opcodes

IO opcodes work seamlessly with all existing PanSpark features:

```panspark
// Use variables to control IO
SET 13 >> ledPin
PIN_MODE ledPin OUTPUT

// Use loops for repetitive IO
SET 0 >> pin
POINT loop_pins
PIN_MODE pin OUTPUT
INC pin
IF pin < 14 >> loop_pins

// Use procedures for IO routines
PROC blinkLED (pin, times)
    SET 0 >> counter
    POINT blink_loop
    DIGITAL_WRITE pin HIGH
    WAIT 100
    DIGITAL_WRITE pin LOW
    WAIT 100
    INC counter
    IF counter < times >> blink_loop
ENDPROC

// Call the procedure
CALL blinkLED (13, 5) >> result
```

---

## Error Handling

Invalid IO operations will produce errors:

```panspark
// Error: Pin value must be a number
DIGITAL_WRITE "invalid" HIGH

// Error: Arrow syntax required
DIGITAL_READ 2 sensorValue  // Missing >>

// Error: Invalid mode
PIN_MODE 13 INVALID_MODE

// Error: Analog read without arrow
ANALOG_READ 0 sensorValue  // Missing >>
```

---

## Performance Notes

- **DIGITAL operations**: ~1-2 microseconds per operation
- **ANALOG_READ**: ~100+ microseconds (ADC conversion time)
- **ANALOG_WRITE (PWM)**: ~1-2 microseconds per operation
- Use `WAIT` between rapid reads to avoid blocking
- Sensor readings are simulated in PanSpark runtime; real values on Arduino hardware

---

## Testing in PanSpark Runtime

IO operations are simulated in the PanSpark runtime. Values are stored in internal variables:

```
__pin_N_mode    -> Pin mode (0=INPUT, 1=OUTPUT)
__pin_N_digital -> Digital state (0=LOW, 1=HIGH)
__pin_N_pwm     -> PWM value (0-255)
__pin_N_analog  -> Analog value (0-1023)
```

To test before deploying to hardware:

```panspark
// Test digital write
PIN_MODE 13 OUTPUT
DIGITAL_WRITE 13 HIGH
// Check output buffer for confirmation

// Test analog write
PIN_MODE 9 OUTPUT
ANALOG_WRITE 9 200
// Check PWM value was set

// Test digital read (simulated)
PIN_MODE 2 INPUT
DIGITAL_READ 2 >> buttonState
PRINT buttonState  // Will be 0 (no real hardware)

// Test analog read (simulated)
ANALOG_READ 0 >> sensorValue
PRINT sensorValue  // Will be 0 (no real hardware)
```

---

## Next Steps

1. **Transpile to Arduino**: Use `transpileToArduino()` to generate Arduino sketches
2. **Upload to hardware**: Copy generated code to Arduino IDE
3. **Monitor Serial**: Use Serial Monitor at 9600 baud to debug
4. **Add advanced logic**: Combine IO with loops, conditionals, and procedures
5. **Build automation**: Create complex IoT and automation systems

