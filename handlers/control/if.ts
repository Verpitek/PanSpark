import { Instruction, VM, ArgType } from "../../panspark";

export function handleIf(vm: VM, instruction: Instruction): boolean {
  const a  = instruction.arguments[0];
  const op = instruction.arguments[1];
  const b  = instruction.arguments[2];

  switch (op.type) {
    // == and != work on both strings and integers
    case ArgType.EQUAL:      return vm.fetchValue(a)  == vm.fetchValue(b);
    case ArgType.NOTEQUAL:   return vm.fetchValue(a)  != vm.fetchValue(b);

    // ordering is integer-only — fetchMemory throws if a string slips in
    case ArgType.LESS:       return vm.fetchMemory(a) <  vm.fetchMemory(b);
    case ArgType.GREATER:    return vm.fetchMemory(a) >  vm.fetchMemory(b);
    case ArgType.LESSEQUAL:  return vm.fetchMemory(a) <= vm.fetchMemory(b);
    case ArgType.GREATEQUAL: return vm.fetchMemory(a) >= vm.fetchMemory(b);

    default: return false;
  }
}