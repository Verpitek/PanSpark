import { InterpreterContext, PanSparkVM, Num } from '../panspark';

export function registerWith(vm: PanSparkVM) {
  vm.registerOpCode("EVAL", (args, context) => {
    // SECURITY: Using eval() is a critical security vulnerability that allows
    // arbitrary code execution. This module is disabled and should not be used.
    // Use MATH opcode instead for safe expression evaluation.
    throw new Error(
      "EVAL opcode is disabled for security reasons. Use MATH for expression evaluation instead."
    );
  });
}
