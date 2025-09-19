import { registerOpCode } from './panspark';

const fileSystemPrefix = 'interpreter_fs_';

/**
 * Writes a key-value pair to the simulated file system (localStorage).
 * The value can be a variable or a number literal.
 * USAGE: FS_WRITE <filename> <value_or_variable>
 */
registerOpCode('FS_WRITE', (args, context) => {
    if (args.length !== 2) {
        throw new Error('FS_WRITE requires a filename and a value.');
    }
    const filename = args[0];
    const value = context.getVar(args[1], 0); // Gets variable or parses number
    
    localStorage.setItem(fileSystemPrefix + filename, value.toString());
});

/**
 * Writes a string literal to the simulated file system.
 * The string must be enclosed in double quotes.
 * USAGE: FS_WRITE_STRING <filename> "the string content"
 */
registerOpCode('FS_WRITE_STRING', (args, context) => {
    if (args.length !== 2) {
        throw new Error('FS_WRITE_STRING requires a filename and a string literal.');
    }
    const filename = args[0];
    const stringContent = args[1]; // The compiler passes the quoted content as a single arg
    
    localStorage.setItem(fileSystemPrefix + filename, stringContent);
});

/**
 * Reads a numerical value from the file system into a variable.
 * If the file doesn't exist or isn't a valid number, it will store 0.
 * USAGE: FS_READ <filename> >> <destination_variable>
 */
registerOpCode('FS_READ', (args, context) => {
    if (args.length !== 3 || args[1] !== '>>') {
        throw new Error('FS_READ syntax: FS_READ <filename> >> <destination>');
    }
    const filename = args[0];
    const destVar = args[2];

    const content = localStorage.getItem(fileSystemPrefix + filename);
    const numericValue = content ? parseFloat(content) : 0;

    context.setVar(destVar, isNaN(numericValue) ? 0 : numericValue);
});

/**
 * Reads a string from the file system and logs it to the browser's developer console.
 * This is a good way to handle text output without changing the interpreter's main buffer.
 * USAGE: FS_LOG_STRING <filename>
 */
registerOpCode('FS_LOG_STRING', (args, context) => {
    if (args.length !== 1) {
        throw new Error('FS_LOG_STRING requires a filename.');
    }
    const filename = args[0];
    const content = localStorage.getItem(fileSystemPrefix + filename);
    
    console.log(`[File System Log] ${filename}:`, content || '(empty)');
});

/**
 * Checks if a "file" exists in the simulated file system.
 * Stores 1 in the destination variable if it exists, 0 otherwise.
 * USAGE: FS_EXISTS <filename> >> <destination_variable>
 */
registerOpCode('FS_EXISTS', (args, context) => {
    if (args.length !== 3 || args[1] !== '>>') {
        throw new Error('FS_EXISTS syntax: FS_EXISTS <filename> >> <destination>');
    }
    const filename = args[0];
    const destVar = args[2];
    
    const content = localStorage.getItem(fileSystemPrefix + filename);
    context.setVar(destVar, content !== null ? 1 : 0);
});
