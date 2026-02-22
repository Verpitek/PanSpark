import { VM } from "../panspark";

// -------------------------------------------------------------------
// PanSpark Array Library
// -------------------------------------------------------------------
// Provides dynamic array/list operations as peripheral opcodes.
//
// USAGE:
//   import { registerArrayLib } from "./lib/array";
//   registerArrayLib(vm);
//
// Each call to registerArrayLib gets its own isolated array store —
// multiple VMs won't bleed into each other.
//
// SAVESTATE:
//   Arrays live on the host and don't survive vm.saveState() alone.
//   Use ARR_PACK before saving and ARR_UNPACK after loading to persist
//   array contents inside VM registers (Option B).
//
// OPCODES:
//   ARR_NEW           >> $dest       create empty array, store handle in $dest
//   ARR_PUSH $h $val               push value onto array
//   ARR_POP  $h       >> $dest       pop last value into $dest (0 if empty)
//   ARR_GET  $h $i    >> $dest       get value at index $i into $dest
//   ARR_SET  $h $i $val             set value at index $i
//   ARR_LEN  $h       >> $dest       store length in $dest
//   ARR_DEL  $h                     destroy array and free handle
//   ARR_PACK $h       >> $dest       serialize array into a register string
//   ARR_UNPACK $reg   >> $dest       deserialize register string back to array
// -------------------------------------------------------------------

export function registerArrayLib(vm: VM): void {
  // Scoped to this registration — each VM gets its own isolated store
  const arrays   = new Map<number, (number | string)[]>();
  let nextHandle = 1;

  const get = (handle: number): (number | string)[] => {
    const arr = arrays.get(handle);
    if (!arr) throw Error(`Invalid array handle: ${handle}`);
    return arr;
  };

  vm.registerPeripheral("ARR_NEW", (vm, args) => {
    const handle = nextHandle++;
    arrays.set(handle, []);
    vm.setMemory(handle, args[0]);
  });

  vm.registerPeripheral("ARR_PUSH", (vm, args) => {
    get(vm.fetchMemory(args[0])).push(vm.fetchValue(args[1]));
  });

  vm.registerPeripheral("ARR_POP", (vm, args) => {
    vm.setMemory(get(vm.fetchMemory(args[0])).pop() ?? 0, args[1]);
  });

  vm.registerPeripheral("ARR_GET", (vm, args) => {
    const arr = get(vm.fetchMemory(args[0]));
    const idx = vm.fetchMemory(args[1]);
    if (idx < 0 || idx >= arr.length) throw Error(`Array index ${idx} out of bounds (length ${arr.length})`);
    vm.setMemory(arr[idx], args[2]);
  });

  vm.registerPeripheral("ARR_SET", (vm, args) => {
    const arr = get(vm.fetchMemory(args[0]));
    const idx = vm.fetchMemory(args[1]);
    if (idx < 0 || idx >= arr.length) throw Error(`Array index ${idx} out of bounds (length ${arr.length})`);
    arr[idx] = vm.fetchValue(args[2]);
  });

  vm.registerPeripheral("ARR_LEN", (vm, args) => {
    vm.setMemory(get(vm.fetchMemory(args[0])).length, args[1]);
  });

  vm.registerPeripheral("ARR_DEL", (vm, args) => {
    arrays.delete(vm.fetchMemory(args[0]));
  });

  // --- Serialisation (Option B) ---
  // Flattens the array into a JSON string stored in a register.
  // Costs heap budget but keeps everything inside VM state so
  // saveState() / loadState() carries it automatically.

  vm.registerPeripheral("ARR_PACK", (vm, args) => {
    vm.setMemory(JSON.stringify(get(vm.fetchMemory(args[0]))), args[1]);
  });

  vm.registerPeripheral("ARR_UNPACK", (vm, args) => {
    const raw = vm.fetchValue(args[0]);
    if (typeof raw !== "string") throw Error("ARR_UNPACK expects a string register");
    const handle = nextHandle++;
    arrays.set(handle, JSON.parse(raw));
    vm.setMemory(handle, args[1]);
  });
}