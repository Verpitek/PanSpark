import { VM } from "./panspark";

const code = `SET 10 >> r0
SET 20 >> r1
ADD r0 r1 >> r2
ADD r2 r2 >> r2
PRINT r2`;
let vm = new VM();
vm.compile(code);
for (const instruction of vm.compile(code)) { };
vm.run()
console.log(vm.outputBuffer);