import { Instruction, VM, Argument } from "../panspark";

function getArray(vm: VM, arg: Argument): number[] {
  const val = vm.fetchValue(arg);
  if (!Array.isArray(val)) throw Error(`Expected array register at line: ${vm.activeInstructionPos + 1}`);
  return val;
}

function updateArray(vm: VM, regIdx: number, newArray: number[]): void {
  const oldVal = vm.registerMemory[regIdx];
  if (oldVal.tag !== "array") throw Error(`Register r${regIdx} is not an array`);
  const oldSize = oldVal.data.length * 2;
  const newSize = newArray.length * 2;
  const delta = newSize - oldSize;
  if (vm.heapUsed() + delta > vm.heapLimit) {
    throw Error(`Heap overflow! Need ${delta} more bytes but only ${vm.heapAvailable()} available.`);
  }
  oldVal.data = newArray;
}

export function handleArrNew(vm: VM, instruction: Instruction): void {
  const size = vm.fetchMemory(instruction.arguments[0]);
  if (size < 0) throw Error(`Array size cannot be negative at line: ${vm.activeInstructionPos + 1}`);
  const arr = Array.from({ length: size }, () => 0);
  vm.setMemory(arr, instruction.arguments[1]);
}

export function handleArrPush(vm: VM, instruction: Instruction): void {
  const arr = getArray(vm, instruction.arguments[0]);
  const val = vm.fetchMemory(instruction.arguments[1]);
  const newArr = [...arr, val];
  const regIdx = (instruction.arguments[0].value as number);
  updateArray(vm, regIdx, newArr);
}

export function handleArrPop(vm: VM, instruction: Instruction): void {
  const arr = getArray(vm, instruction.arguments[0]);
  const popped = arr.length > 0 ? arr[arr.length - 1] : 0;
  const newArr = arr.slice(0, -1);
  const regIdx = (instruction.arguments[0].value as number);
  updateArray(vm, regIdx, newArr);
  vm.setMemory(popped, instruction.arguments[1]);
}

export function handleArrGet(vm: VM, instruction: Instruction): void {
  const arr = getArray(vm, instruction.arguments[0]);
  const idx = vm.fetchMemory(instruction.arguments[1]);
  if (idx < 0 || idx >= arr.length) throw Error(`Array index ${idx} out of bounds (length ${arr.length})`);
  vm.setMemory(arr[idx], instruction.arguments[2]);
}

export function handleArrSet(vm: VM, instruction: Instruction): void {
  const arr = getArray(vm, instruction.arguments[0]);
  const idx = vm.fetchMemory(instruction.arguments[1]);
  if (idx < 0 || idx >= arr.length) throw Error(`Array index ${idx} out of bounds (length ${arr.length})`);
  const val = vm.fetchMemory(instruction.arguments[2]);
  const newArr = [...arr];
  newArr[idx] = val;
  const regIdx = (instruction.arguments[0].value as number);
  updateArray(vm, regIdx, newArr);
}

export function handleArrLen(vm: VM, instruction: Instruction): void {
  const arr = getArray(vm, instruction.arguments[0]);
  vm.setMemory(arr.length, instruction.arguments[1]);
}

export function handleArrSort(vm: VM, instruction: Instruction): void {
  const arr = getArray(vm, instruction.arguments[0]);
  const newArr = [...arr].sort((a, b) => a - b);
  const regIdx = (instruction.arguments[0].value as number);
  updateArray(vm, regIdx, newArr);
}