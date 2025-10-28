import { PanSparkVM } from "./panspark";

const vm = new PanSparkVM();
const code = `
  SET 5 >> x
  MATH -(2 * x + 3) >> result
  PRINT result
`;

const instructions = vm.compile(code);
console.log("Instruction 1 (MATH):", instructions[1]);

try {
  const program = vm.run(instructions);
  while (program.next().done === false) {}
  console.log("Output:", vm.buffer);
} catch (err) {
  console.error("Error:", err.message);
}
