import { InterpreterContext, PanSparkVM } from '../panspark';

// Global list memory - this could be per-VM instance instead
let listMemory: Map<string, number[]> = new Map();

export function registerWith(vm: PanSparkVM) {
  // Reset list memory for this VM instance
  listMemory = new Map();

  // LIST_CREATE [<list>] >> <listName>
  vm.registerOpCode("LIST_CREATE", (args, context) => {
    if (args.length < 3 || args[1] !== ">>") {
      throw new Error(`LIST_CREATE syntax error: Expected 'LIST_CREATE [values] >> listName', got ${args.length} arguments`);
    }
    
    if (args[0].split(",").length > 0 || args[1] === ">>"){
      const values = args[0].split(",");
      let parsedValues = [];
      for (let i = 0; i < values.length; i++) {
        try {
          parsedValues.push(context.getVar(values[i].trim(), 0));
        } catch (error) {
          throw new Error(`LIST_CREATE error: Cannot resolve value '${values[i].trim()}' in list creation`);
        }
      }
      listMemory.set(args[2], parsedValues);
    } else {
      listMemory.set(args[2], []);
    }
  });

  // LIST_GET <listName> <index> >> <varName>
  vm.registerOpCode("LIST_GET", (args, context) => {
    if (args.length !== 4 || args[2] !== ">>") {
      throw new Error(`LIST_GET syntax error: Expected 'LIST_GET listName index >> varName', got ${args.length} arguments`);
    }
    
    const list = listMemory.get(args[0]);
    if (!list) {
      throw new Error(`LIST_GET error: List '${args[0]}' does not exist`);
    }
    
    const index = context.getVar(args[1], 0);
    if (index < 0 || index >= list.length) {
      throw new Error(`LIST_GET error: Index ${index} out of bounds for list '${args[0]}' (length: ${list.length})`);
    }
    
    context.setVar(args[3], list[index]);
  });

  // LIST_SET <varName> <index> >> <listName>
  vm.registerOpCode("LIST_SET", (args, context) => {
    if (args.length !== 4 || args[2] !== ">>") {
      throw new Error(`LIST_SET syntax error: Expected 'LIST_SET value index >> listName', got ${args.length} arguments`);
    }
    
    const variable = context.getVar(args[0], 0);
    const index = context.getVar(args[1], 0);
    const list = listMemory.get(args[3]);
    
    if (!list) {
      throw new Error(`LIST_SET error: List '${args[3]}' does not exist`);
    }
    
    if (index < 0 || index >= list.length) {
      throw new Error(`LIST_SET error: Index ${index} out of bounds for list '${args[3]}' (length: ${list.length})`);
    }
    
    list[index] = variable;
    listMemory.set(args[3], list);
  });

  // LIST_PUSH <varName> >> <listName>
  vm.registerOpCode("LIST_PUSH", (args, context) => {
    if (args.length !== 3 || args[1] !== ">>") {
      throw new Error(`LIST_PUSH syntax error: Expected 'LIST_PUSH value >> listName', got ${args.length} arguments`);
    }
    
    const variable = context.getVar(args[0], 0);
    const list = listMemory.get(args[2]);
    
    if (!list) {
      throw new Error(`LIST_PUSH error: List '${args[2]}' does not exist`);
    }
    
    list.push(variable);
    listMemory.set(args[2], list);
  });

  // LIST_LEN <listName> >> <varName>
  vm.registerOpCode("LIST_LEN", (args, context) => {
    if (args.length !== 3 || args[1] !== ">>") {
      throw new Error(`LIST_LEN syntax error: Expected 'LIST_LEN listName >> varName', got ${args.length} arguments`);
    }
    
    const list = listMemory.get(args[0]);
    if (!list) {
      throw new Error(`LIST_LEN error: List '${args[0]}' does not exist`);
    }
    
    context.setVar(args[2], list.length);
  });

  // LIST_DUMP <listName> - Prints all elements of the list to output buffer
  vm.registerOpCode("LIST_DUMP", (args, context) => {
    if (args.length !== 1) {
      throw new Error(`LIST_DUMP syntax error: Expected 'LIST_DUMP listName', got ${args.length} arguments`);
    }
    
    const list = listMemory.get(args[0]);
    if (!list) {
      throw new Error(`LIST_DUMP error: List '${args[0]}' does not exist`);
    }
    
    vm.buffer.push(`LIST_DUMP [${args[0]}]: [${list.join(", ")}] (length: ${list.length})`);
  });

  // LIST_SORT <listName> [asc|desc] - Sorts the list in place (ascending by default)
  vm.registerOpCode("LIST_SORT", (args, context) => {
    if (args.length < 1 || args.length > 2) {
      throw new Error(`LIST_SORT syntax error: Expected 'LIST_SORT listName [asc|desc]', got ${args.length} arguments`);
    }
    
    const list = listMemory.get(args[0]);
    if (!list) {
      throw new Error(`LIST_SORT error: List '${args[0]}' does not exist`);
    }
    
    const sortOrder = args.length === 2 ? args[1].toLowerCase() : "asc";
    
    if (sortOrder !== "asc" && sortOrder !== "desc") {
      throw new Error(`LIST_SORT error: Invalid sort order '${args[1]}'. Use 'asc' or 'desc'`);
    }
    
    if (sortOrder === "desc") {
      list.sort((a, b) => b - a);
    } else {
      list.sort((a, b) => a - b);
    }
    
    listMemory.set(args[0], list);
  });
}