import { Instruction, VM } from "../panspark";

export function handleSub(vm: VM, instruction: Instruction): void {
  const arg1 = instruction.arguments[0];
  const arg2 = instruction.arguments[1];
  const result = instruction.arguments[2];
  vm.setMemory(vm.fetchMemory(arg1) - vm.fetchMemory(arg2), result)
}