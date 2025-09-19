import { registerOpCode, InterpreterContext, buffer } from './panspark'; // Assuming your code is in interpreter.ts

// Custom OpCode: SQUARE - Calculates the square of a number and stores it.
// Usage: SQUARE <source_variable_or_number> >> <destination_variable>
registerOpCode('SQUARE', (args, context) => {
    if (args.length !== 3 || args[1] !== '>>') {
        throw new Error('SQUARE syntax: SQUARE <source> >> <destination>');
    }
    const sourceValue = context.getVar(args[0], 0);
    const destVariable = args[2];
    
    context.setVar(destVariable, sourceValue * sourceValue);
});

// Custom OpCode: LOG - A simpler version of ECHO that prints to the console.
// Usage: LOG "some message" <variable>
registerOpCode('LOG', (args, context) => {
    const message = args.map(arg => {
        try {
            return context.getVar(arg, 0).toString();
        } catch {
            return arg;
        }
    }).join(' ');

    buffer.push(`[LOG]: ${message}`);
});