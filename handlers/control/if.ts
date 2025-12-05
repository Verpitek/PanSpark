import { Instruction, VM, ArgType } from "../../panspark";

export function handleIf(vm: VM, instruction: Instruction): boolean {
  const arg1 = instruction.arguments[0];
  const operator = instruction.arguments[1];
  const arg2 = instruction.arguments[2];

  let condition: boolean;
  switch (operator.type) {
    case ArgType.EQUAL:
      condition = vm.fetchMemory(arg1) == vm.fetchMemory(arg2);
      break;
    case ArgType.NOTEQUAL:
      condition = vm.fetchMemory(arg1) != vm.fetchMemory(arg2);
      break;
    case ArgType.LESS:
      condition = vm.fetchMemory(arg1) < vm.fetchMemory(arg2);
      break;
    case ArgType.GREATER:
      condition = vm.fetchMemory(arg1) > vm.fetchMemory(arg2);
      break;
    case ArgType.LESSEQUAL:
      condition = vm.fetchMemory(arg1) <= vm.fetchMemory(arg2);
      break;
    case ArgType.GREATEQUAL:
      condition = vm.fetchMemory(arg1) >= vm.fetchMemory(arg2);
      break;
    default:
      condition = false;
  }
  return condition;
}