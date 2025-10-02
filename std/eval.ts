import { InterpreterContext, PanSparkVM } from '../panspark';

// Global list memory - this could be per-VM instance instead
let listMemory: Map<string, number[]> = new Map();

export function registerWith(vm: PanSparkVM) {
  vm.registerOpCode("EVAL", (args, context) => {
    context.setVar(args[2], Number(eval(args[0])));
  });
}
