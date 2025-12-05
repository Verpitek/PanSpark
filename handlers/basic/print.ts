import { Instruction, VM, ArgType } from "../../panspark";

export function handlePrint(vm: VM, instruction: Instruction): void {
  const data = instruction.arguments[0];
  if (data.type == ArgType.LITERAL) {
    vm.outputBuffer.push(data.value);
  }
  if (data.type == ArgType.REGISTER) {
    vm.outputBuffer.push(vm.fetchMemory(data));
  }
  if (data.type == ArgType.MEMORY) {
    vm.outputBuffer.push(vm.fetchMemory(data));
  }
}
