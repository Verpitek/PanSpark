import { Instruction, VM, Argument, ArgType } from "../../panspark";

function toNumber(vm: VM, arg: Argument): number {
  const val = vm.fetchValue(arg);
  if (typeof val === "number") return val;
  if (Array.isArray(val)) return val.reduce((sum, n) => sum + n, 0);
  throw Error(`Expected number or array but got string at line: ${vm.activeInstructionPos + 1}`);
}

export function handleIf(vm: VM, instruction: Instruction): boolean {
  const a  = instruction.arguments[0];
  const op = instruction.arguments[1];
  const b  = instruction.arguments[2];

  switch (op.type) {
    // == and != work on strings, integers, and arrays (compare sums)
    case ArgType.EQUAL: {
      const aVal = vm.fetchValue(a);
      const bVal = vm.fetchValue(b);
      if (typeof aVal === "string" || typeof bVal === "string") {
        // string equality (both must be strings)
        return aVal === bVal;
      }
      const aNum = Array.isArray(aVal) ? aVal.reduce((s, n) => s + n, 0) : aVal;
      const bNum = Array.isArray(bVal) ? bVal.reduce((s, n) => s + n, 0) : bVal;
      return aNum === bNum;
    }
    case ArgType.NOTEQUAL: {
      const aVal = vm.fetchValue(a);
      const bVal = vm.fetchValue(b);
      if (typeof aVal === "string" || typeof bVal === "string") {
        return aVal !== bVal;
      }
      const aNum = Array.isArray(aVal) ? aVal.reduce((s, n) => s + n, 0) : aVal;
      const bNum = Array.isArray(bVal) ? bVal.reduce((s, n) => s + n, 0) : bVal;
      return aNum !== bNum;
    }

    // ordering compares numbers or array sums
    case ArgType.LESS:       return toNumber(vm, a) <  toNumber(vm, b);
    case ArgType.GREATER:    return toNumber(vm, a) >  toNumber(vm, b);
    case ArgType.LESSEQUAL:  return toNumber(vm, a) <= toNumber(vm, b);
    case ArgType.GREATEQUAL: return toNumber(vm, a) >= toNumber(vm, b);

    default: return false;
  }
}