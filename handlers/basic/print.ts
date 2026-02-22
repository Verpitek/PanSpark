import { Instruction, VM } from "../../panspark";

export function handlePrint(vm: VM, instruction: Instruction): void {
  vm.outputBuffer.push(vm.fetchValue(instruction.arguments[0]));
}