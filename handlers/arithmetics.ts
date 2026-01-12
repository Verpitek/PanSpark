import { Instruction, VM } from "../panspark";

export function handleMul(vm: VM, instruction: Instruction): void {
  const arg1 = instruction.arguments[0];
  const arg2 = instruction.arguments[1];
  const result = instruction.arguments[2];
  vm.setMemory(vm.fetchMemory(arg1) * vm.fetchMemory(arg2), result);
}

export function handleDiv(vm: VM, instruction: Instruction): void {
  const arg1 = instruction.arguments[0];
  const arg2 = instruction.arguments[1];
  const result = instruction.arguments[2];
  vm.setMemory(vm.fetchMemory(arg1) / vm.fetchMemory(arg2), result);
}

export function handleMod(vm: VM, instruction: Instruction): void {
  const arg1 = instruction.arguments[0];
  const arg2 = instruction.arguments[1];
  const result = instruction.arguments[2];
  vm.setMemory(vm.fetchMemory(arg1) % vm.fetchMemory(arg2), result);
}

export function handleSqrt(vm: VM, instruction: Instruction): void {
  const arg1 = instruction.arguments[0];
  const result = instruction.arguments[1];
  vm.setMemory(Math.sqrt(vm.fetchMemory(arg1)), result);
}

export function handlePow(vm: VM, instruction: Instruction): void {
  const arg1 = instruction.arguments[0];
  const arg2 = instruction.arguments[1];
  const result = instruction.arguments[2];
  vm.setMemory(Math.pow(vm.fetchMemory(arg1), vm.fetchMemory(arg2)), result);
}

export function handleAbs(vm: VM, instruction: Instruction): void {
  const arg1 = instruction.arguments[0];
  const result = instruction.arguments[1];
  vm.setMemory(Math.abs(vm.fetchMemory(arg1)), result);
}

export function handleMin(vm: VM, instruction: Instruction): void {
  const arg1 = instruction.arguments[0];
  const arg1Data = vm.fetchMemory(arg1);
  const arg2 = instruction.arguments[1];
  const arg2Data = vm.fetchMemory(arg2);
  const result = instruction.arguments[2];
  if (arg1Data < arg2Data) {
    vm.setMemory(arg1Data, result);
  } else {
    vm.setMemory(arg2Data, result);
  }
}

export function handleMax(vm: VM, instruction: Instruction): void {
  const arg1 = instruction.arguments[0];
  const arg1Data = vm.fetchMemory(arg1);
  const arg2 = instruction.arguments[1];
  const arg2Data = vm.fetchMemory(arg2);
  const result = instruction.arguments[2];
  if (arg1Data > arg2Data) {
    vm.setMemory(arg1Data, result);
  } else {
    vm.setMemory(arg2Data, result);
  }
}

export function handleInc(vm: VM, instruction: Instruction): void {
  const arg1 = instruction.arguments[0];
  const arg1Data = vm.fetchMemory(arg1);
  vm.setMemory(arg1Data+1, arg1);
}

export function handleDec(vm: VM, instruction: Instruction): void {
  const arg1 = instruction.arguments[0];
  const arg1Data = vm.fetchMemory(arg1);
  vm.setMemory(arg1Data-1, arg1);
}

export function handleDec(vm: VM, instruction: Instruction): void {
  const arg1 = instruction.arguments[0];
  const arg1Data = vm.fetchMemory(arg1);
  vm.setMemory(arg1Data-1, arg1);
}

export function handleRng(vm: VM, instruction: Instruction): void {
  const start = vm.fetchMemory(instruction.arguments[0]);
  const stop = vm.fetchMemory(instruction.arguments[1]);
  const resultRef = instruction.arguments[2];
  const min = Math.min(start, stop);
  const max = Math.max(start, stop);
  const generatedValue = Math.floor(Math.random() * (max - min + 1)) + min;
  vm.setMemory(generatedValue, resultRef);
}