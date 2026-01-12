import { VM } from "./panspark";

const code2 = `PRINT 10`;

const vm = new VM(8, 8);
for (const instruction of vm.compile(code2)) {
  console.log(instruction);
}
const gen = vm.run();
console.log(vm.registerMemory);
let result = gen.next();
while (!result.done) {
  console.log(vm.outputBuffer);
  result = gen.next();
}
