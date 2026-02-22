import { Instruction, VM } from "../../panspark";

export function handleSet(vm: VM, instruction: Instruction): void {
  vm.setMemory(vm.fetchValue(instruction.arguments[0]), instruction.arguments[1]);
}