import { run, compile, resetVM, buffer } from "./runtime";
let code: string = `  
PROC add (num1, num2) {
  MATH num1 + num2 >> result
  RETURN result
}

CALL add (10, 20) >> result
PRINT result
`;

const program = run(compile(code));

while (program.next().done === false) {
}



resetVM();