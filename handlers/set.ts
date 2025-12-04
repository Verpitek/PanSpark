import { Instruction, VM, ArgType } from "../panspark";

export function handleSet(vm: VM, instruction: Instruction): void {
  const data = instruction.arguments[0];
  const register = instruction.arguments[1];
  vm.setMemory(data.value, register);
}