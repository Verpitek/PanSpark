# PanSpark Hardware IO - Quick Reference

## Syntax at a Glance

### PIN_MODE - Configure Pin Direction
```panspark
PIN_MODE pin INPUT|OUTPUT
```
**Example**: `PIN_MODE 13 OUTPUT`

### DIGITAL_WRITE - Set Pin HIGH/LOW
```panspark
DIGITAL_WRITE pin HIGH|LOW
```
**Example**: `DIGITAL_WRITE 13 HIGH`

### DIGITAL_READ - Read Pin State
```panspark
DIGITAL_READ pin >> variable
```
**Example**: `DIGITAL_READ 2 >> buttonState`

### ANALOG_WRITE - PWM Output (0-255)
```panspark
ANALOG_WRITE pin value
```
**Example**: `ANALOG_WRITE 9 200`

### ANALOG_READ - Read Analog Input (0-1023)
```panspark
ANALOG_READ pin >> variable
```
**Example**: `ANALOG_READ 0 >> sensorValue`

---

## One-Minute Tutorial

### Blink an LED
```panspark
PIN_MODE 13 OUTPUT
DIGITAL_WRITE 13 HIGH
WAIT 1000
DIGITAL_WRITE 13 LOW
END
```

### Read a Button
```panspark
PIN_MODE 2 INPUT
DIGITAL_READ 2 >> pressed
PRINT pressed
END
```

### PWM LED Brightness
```panspark
PIN_MODE 9 OUTPUT
ANALOG_WRITE 9 128  // 50% brightness
END
```

### Read Temperature Sensor
```panspark
PIN_MODE 0 INPUT
ANALOG_READ 0 >> temp
PRINT temp
END
```

---

## Common Pin Assignments (Arduino Uno)

| Purpose | Pin | Mode |
|---------|-----|------|
| LED | 13 | OUTPUT |
| Button | 2,3 | INPUT |
| Sensor (analog) | A0-A5 | INPUT |
| PWM LED | 3,5,6,9,10,11 | OUTPUT |
| Motor (PWM) | 9,10 | OUTPUT |
| Relay | Any | OUTPUT |
| Buzzer | 11,12 | OUTPUT (PWM) |

---

## Pattern: LED Blinker
```panspark
PIN_MODE 13 OUTPUT
POINT loop
DIGITAL_WRITE 13 HIGH
WAIT 500
DIGITAL_WRITE 13 LOW
WAIT 500
JUMP loop
```

## Pattern: Button Press Detection
```panspark
PIN_MODE 2 INPUT
PIN_MODE 13 OUTPUT
DIGITAL_READ 2 >> state
IF state == 1 >> pressed
JUMP done
POINT pressed
DIGITAL_WRITE 13 HIGH
WAIT 100
DIGITAL_WRITE 13 LOW
POINT done
```

## Pattern: Sensor Reading Loop
```panspark
PIN_MODE 0 INPUT
POINT loop
ANALOG_READ 0 >> value
PRINT value
WAIT 1000
JUMP loop
```

## Pattern: PWM Fade
```panspark
PIN_MODE 9 OUTPUT
SET 0 >> brightness
POINT loop
ANALOG_WRITE 9 brightness
INC brightness
IF brightness < 255 >> loop
END
```

---

## Value Reference

### Digital Values
- `HIGH` = 1 = 5V
- `LOW` = 0 = 0V

### PWM Values
- 0 = 0% power (off)
- 128 = 50% power
- 255 = 100% power (full)

### Analog Values (10-bit ADC)
- 0 = 0V
- 512 = 2.5V
- 1023 = 5V

---

## Common Sensors & Actuators

| Device | Pin Type | Value Range | Notes |
|--------|----------|-------------|-------|
| LED | Digital OUT | HIGH/LOW | 330Ω resistor |
| Button | Digital IN | HIGH/LOW | Pull-up req'd |
| Relay | Digital OUT | HIGH/LOW | Needs diode |
| Motor | PWM OUT | 0-255 | Needs transistor |
| Buzzer | PWM OUT | 0-255 | Active or passive |
| Temperature | Analog IN | 0-1023 | LM35, DHT11 |
| Light Sensor | Analog IN | 0-1023 | LDR, BH1750 |
| Distance | Analog IN | 0-1023 | Ultrasonic, IR |
| Potentiometer | Analog IN | 0-1023 | 3-pin variable resistor |

---

## Complete Minimal Example

```panspark
// LED controlled by button
PIN_MODE 2 INPUT    // Button
PIN_MODE 13 OUTPUT  // LED

POINT loop
DIGITAL_READ 2 >> buttonPressed
DIGITAL_WRITE 13 buttonPressed
WAIT 100
JUMP loop
```

---

## Transpile & Upload

```typescript
const vm = new PanSparkVM();
const code = `
PIN_MODE 13 OUTPUT
DIGITAL_WRITE 13 HIGH
WAIT 1000
DIGITAL_WRITE 13 LOW
`;
const arduino = vm.transpileToArduino(code);
console.log(arduino);  // Copy to Arduino IDE → Upload
```

---

## Debugging Tips

1. **Check pin numbers**: Most boards use 0-13 digital, A0-A5 analog
2. **Add PRINT statements**: Verify variable values at each step
3. **Use MEMDUMP**: See all variables and pin states
4. **Test without hardware**: Run in PanSpark runtime first
5. **Monitor Serial Output**: Use Arduino IDE Serial Monitor (9600 baud)

---

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `PIN_MODE mode must be a number` | Invalid mode value | Use INPUT or OUTPUT |
| `DIGITAL_WRITE value must be a number` | Invalid pin value | Use number or HIGH/LOW |
| `Invalid DIGITAL_READ syntax` | Missing >> operator | Use: `DIGITAL_READ pin >> var` |
| `Invalid ANALOG_READ syntax` | Missing >> operator | Use: `ANALOG_READ pin >> var` |

---

## Next Steps

1. ✅ **Understand IO basics** - See patterns above
2. 📚 **Read full documentation** - See `IO_OPCODES.md`
3. 💾 **Study examples** - See `IO_EXAMPLES.md`
4. 🧪 **Test in simulator** - Run in PanSpark runtime
5. 📱 **Transpile to Arduino** - Generate C++ code
6. 🔌 **Build hardware** - Connect components to Arduino
7. ⬆️ **Upload sketch** - Use Arduino IDE
8. 🎉 **Deploy to production** - Run your automation!

---

## Cheat Sheet: Copy & Paste Ready

### Blink 10 times
```panspark
PIN_MODE 13 OUTPUT
SET 0 >> i
POINT blink
DIGITAL_WRITE 13 HIGH
WAIT 200
DIGITAL_WRITE 13 LOW
WAIT 200
INC i
IF i < 10 >> blink
END
```

### Count button presses
```panspark
PIN_MODE 2 INPUT
PIN_MODE 13 OUTPUT
SET 0 >> count
POINT read
DIGITAL_READ 2 >> state
IF state == 1 >> increment
JUMP read
POINT increment
INC count
DIGITAL_WRITE 13 HIGH
WAIT 100
DIGITAL_WRITE 13 LOW
JUMP read
```

### Fade LED in/out
```panspark
PIN_MODE 9 OUTPUT
SET 0 >> brightness
SET 1 >> direction
POINT fade
ANALOG_WRITE 9 brightness
IF direction == 1 >> increase
DEC brightness
IF brightness > 0 >> fade
SET 1 >> direction
JUMP fade
POINT increase
INC brightness
IF brightness < 255 >> fade
SET -1 >> direction
JUMP fade
```

### Average 10 analog readings
```panspark
PIN_MODE 0 INPUT
SET 0 >> sum
SET 0 >> i
POINT sample
ANALOG_READ 0 >> value
MATH sum + value >> sum
INC i
IF i < 10 >> sample
MATH sum / 10 >> average
PRINT average
END
```

