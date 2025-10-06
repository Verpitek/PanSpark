#!/usr/bin/env bun
import { createVM, PanSparkVM } from './panspark'; // adjust path if needed
import fs from 'fs';
import readline from 'readline';

const vm: PanSparkVM = createVM();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'panspark> ',
});

async function runFile(filePath: string) {
  try {
    const code = await fs.promises.readFile(filePath, 'utf-8');
    const instructions = vm.compile(code);
    for (const _ of vm.run(instructions)) {
      // execution generator - ignores ticks for REPL simplicity
    }
    vm.getBuffer().forEach(line => console.log(line));
    vm.buffer = [];
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function startREPL() {
  rl.prompt();

  rl.on('line', async (line) => {
    line = line.trim();

    if (line === 'exit') {
      rl.close();
      return;
    }

    // If the line is a file command, run the file
    if (line.startsWith('load ')) {
      const filePath = line.slice(5).trim();
      if (fs.existsSync(filePath)) {
        await runFile(filePath);
      } else {
        console.error(`File not found: ${filePath}`);
      }
    } else {
      // Otherwise treat it as inline code
      try {
        const instructions = vm.compile(line);
        for (const _ of vm.run(instructions)) {}
        vm.getBuffer().forEach(l => console.log(l));
        vm.buffer = [];
      } catch (err) {
        console.error('Error:', err.message);
      }
    }

    rl.prompt();
  }).on('close', () => {
    console.log('Goodbye :3');
    process.exit(0);
  });
}

// If a file is passed as argument, run it and exit
if (process.argv.length > 2) {
  const fileArg = process.argv[2];
  if (fs.existsSync(fileArg)) {
    runFile(fileArg).then(() => process.exit(0));
  } else {
    console.error(`File not found: ${fileArg}`);
    process.exit(1);
  }
} else {
  startREPL();
}
