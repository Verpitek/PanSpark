import { run } from './runtime';

let code: string = 
  `SET 10 >> num1
  SET 20 >> num2
  SET 0 >> result
  
  MATH num1 + num2 >> result
  PRINT result
  
  SET 0 >> counter
  
  
  POINT imdone
  PRINT "hello world!"
  MATH counter + 1 >> counter
  IF counter <= 10 >> imdone
  `;

run(code);