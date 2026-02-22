import { Instruction, VM } from "../../panspark";

export function handleAdd(vm: VM, instruction: Instruction): void {
  vm.setMemory(
    vm.fetchMemory(instruction.arguments[0]) + vm.fetchMemory(instruction.arguments[1]),
    instruction.arguments[2],
  );
}