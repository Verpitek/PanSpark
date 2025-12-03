import { Instruction, VM, ArgType } from "../panspark";

export function handleSet(vm: VM, instruction: Instruction): void {
  const data = instruction.arguments[0];
  const register = instruction.arguments[1];
  if (data.type == ArgType.LITERAL) {
    if (register.type == ArgType.REGISTER) {
      vm.touchRegister(register.value, data.value);
    } 
    if (register.type == ArgType.MEMORY) {
      vm.touchMemory(register.value, data.value);
    }
  }
  if (data.type = ArgType.REGISTER) {
    if (register.type == ArgType.REGISTER) {
      vm.touchRegister(register.value, data.value);
    } 
    if (register.type == ArgType.MEMORY) {
      vm.touchMemory(register.value, data.value);
    }
  }
  if (data.type = ArgType.MEMORY) {
    if (register.type == ArgType.REGISTER) {
      vm.touchRegister(register.value, data.value);
    } 
    if (register.type == ArgType.MEMORY) {
      vm.touchMemory(register.value, data.value);
    }
  }
}