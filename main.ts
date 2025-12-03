import { VM } from "./panspark";

const code = `SET 10 >> r0
SET 20 >> r1
PRINT r1`;
let vm = new VM();
vm.compile(code);
for (const instruction of vm.compile(code)) { };
vm.run()
console.log(vm.outputBuffer);