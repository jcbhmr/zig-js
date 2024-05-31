import helloWorldWASMURL from "../zig-out/bin/hello-world.wasm?url";
import { Zig } from "./zig_wasm_exec.js";

const zig = new Zig();
const { module, instance } = await WebAssembly.instantiateStreaming(
  fetch(helloWorldWASMURL),
  zig.importObject,
);
await zig.run(instance);

const app = document.querySelector<HTMLDivElement>('#app')!;