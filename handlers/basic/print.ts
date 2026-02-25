import { Instruction, VM } from "../../panspark";

export function handlePrint(vm: VM, instruction: Instruction): void {
  const value = vm.fetchValue(instruction.arguments[0]);
  if (Array.isArray(value)) {
    vm.outputBuffer.push(JSON.stringify(value));
  } else {
    vm.outputBuffer.push(value);
  }
}