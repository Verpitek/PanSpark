import { Instruction, VM } from "../panspark";

export function handleMul(vm: VM, instruction: Instruction): void {
  vm.setMemory(
    vm.fetchMemory(instruction.arguments[0]) * vm.fetchMemory(instruction.arguments[1]),
    instruction.arguments[2],
  );
}

export function handleDiv(vm: VM, instruction: Instruction): void {
  const divisor = vm.fetchMemory(instruction.arguments[1]);
  if (divisor === 0) throw Error(`Division by zero at line: ${vm.activeInstructionPos + 1}`);
  vm.setMemory(vm.fetchMemory(instruction.arguments[0]) / divisor, instruction.arguments[2]);
}

export function handleMod(vm: VM, instruction: Instruction): void {
  const divisor = vm.fetchMemory(instruction.arguments[1]);
  if (divisor === 0) throw Error(`Modulo by zero at line: ${vm.activeInstructionPos + 1}`);
  vm.setMemory(vm.fetchMemory(instruction.arguments[0]) % divisor, instruction.arguments[2]);
}

export function handleSqrt(vm: VM, instruction: Instruction): void {
  vm.setMemory(Math.sqrt(vm.fetchMemory(instruction.arguments[0])), instruction.arguments[1]);
}

export function handlePow(vm: VM, instruction: Instruction): void {
  vm.setMemory(
    Math.pow(vm.fetchMemory(instruction.arguments[0]), vm.fetchMemory(instruction.arguments[1])),
    instruction.arguments[2],
  );
}

export function handleAbs(vm: VM, instruction: Instruction): void {
  vm.setMemory(Math.abs(vm.fetchMemory(instruction.arguments[0])), instruction.arguments[1]);
}

export function handleMin(vm: VM, instruction: Instruction): void {
  vm.setMemory(
    Math.min(vm.fetchMemory(instruction.arguments[0]), vm.fetchMemory(instruction.arguments[1])),
    instruction.arguments[2],
  );
}

export function handleMax(vm: VM, instruction: Instruction): void {
  vm.setMemory(
    Math.max(vm.fetchMemory(instruction.arguments[0]), vm.fetchMemory(instruction.arguments[1])),
    instruction.arguments[2],
  );
}

export function handleInc(vm: VM, instruction: Instruction): void {
  const arg = instruction.arguments[0];
  vm.setMemory(vm.fetchMemory(arg) + 1, arg);
}

export function handleDec(vm: VM, instruction: Instruction): void {
  const arg = instruction.arguments[0];
  vm.setMemory(vm.fetchMemory(arg) - 1, arg);
}

export function handleRng(vm: VM, instruction: Instruction): void {
  const a   = vm.fetchMemory(instruction.arguments[0]);
  const b   = vm.fetchMemory(instruction.arguments[1]);
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  vm.setMemory(Math.floor(Math.random() * (max - min + 1)) + min, instruction.arguments[2]);
}