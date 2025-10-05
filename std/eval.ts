import { InterpreterContext, PanSparkVM, Num } from '../panspark';

export function registerWith(vm: PanSparkVM) {
  vm.registerOpCode("EVAL", (args, context) => {
    context.setVar(args[2], Num(eval(args[0])));
  });
}
