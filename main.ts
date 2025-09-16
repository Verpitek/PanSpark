import { run, compile, resetVM, buffer } from "./runtime";
let code: string = `
  SET 20 >> num1
  SET 10 >> num2
  SET 0 >> result
  
  MATH num1 + num2 >> result
  PRINT result
  
  PROC loop
    SET 69 >> thingy
    MATH result + 1 >> result
    PRINT result
    IF result <= 1200 >> loop
  ENDPROC
`;

const kebab = await run(compile(code));

for (let i = 0; i < buffer.length; i++) {
  console.log(buffer[i]);
}

resetVM();