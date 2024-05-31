# zig-js

zig-js is a Zig library (and accompanying JS glue) that enables Zig
running in a WebAssembly environment to interact with a JavaScript-based
host.

Note this makes it particularly easy for Zig to call into JS. This
doesn't help for JS calling into Zig. This is more akin to Go's
`syscall/js` package and not like Rust's `wasm-bindgen`.

Note: the main branch of this repository attempts to remain compatible
with the latest nightly release of Zig, and therefore may not be compatible
with official Zig releases.

## Example

```zig
// Get and set objects and properties
const document = try js.global.get(js.Object, "document");
defer document.deinit();

const title = try document.getAlloc(js.String, alloc, "title");
defer alloc.free(title);
std.log.info("the title is: {s}", .{str});

try document.set("title", js.string("A new title."));

// Call functions
js.global.call(void, "alert", .{js.string("Hello from Zig!")});
```

The code is a bit verbose with the error handling but since JS is a
dynamic language there are potential invalid types at every step of the
way. Additionally, `deinit` calls are necessary to dereference garbage-collected
values on the host side.

Under the covers, this is hiding a lot of complexity since the JS/WASM
ABI only allows passing numeric types and sharing memory.

## Usage

To use this library, you must integrate a component in both the Zig
and JS environment. For Zig, vendor this repository and add the package.
For example in your build.zig:

```zig
const js = @import("zig-js");

pub fn build(b: *std.build.Builder) !void {
  // ... other stuff

  exe.addPackage(js.pkg);
}
```

From JS, install and import the package in the `js/` directory (in the future
this will be published to npm). A TypeScript example is shown below but
JS could just as easily be used:

```typescript
import { ZigJS } from 'zig-js-glue';

// Initialize the stateful zigjs class. You should use one per wasm instance.
const zigjs = new ZigJS();

fetch('my-wasm-file.wasm').then(response =>
  response.arrayBuffer()
).then(bytes =>
  // When creating your Wasm instance, pass along the zigjs import
  // object. You can merge this import object with your own since zigjs
  // uses its own namespace.
  WebAssembly.instantiate(bytes, zigjs.importObject())
).then(results => {
  const { memory, my_func } = results.instance.exports;

  // Set the memory since zigjs interfaces with memory.
  zigjs.memory = memory;

  // Run any of your exported functions!
  my_func();
});
```

**WARNING:** The zig-js version used in your Zig code and JS code must match.
I'm not promising any protocol stability right now so pin your versions
appropriately. To determine what version is compatible, look up the tagged
version in this repository and the corresponding commits.

## Internals

The fundamental idea in this is based on the Go
[syscall/js](https://pkg.go.dev/syscall/js) package. The implementation
is relatively diverged since Zig doesn't have a runtime or garbage collection,
but the fundamental idea of sharing "refs" and the format of those refs is
based on Go's implementation.

The main idea is that Zig communicates to JS what values it would like
to request, such as the "global" object. JS generates a "ref" for this
object (a unique 64-bit numeric value) and sends that to Zig. This ref now
uniquely identifies the value for future calls such as "give me the
'document' property on this ref."

The ref itself is a 64-bit value. For numeric types, the ref _is_ the
value. We take advantage of the fact that all numbers in JavaScript are
IEEE 754 encoded 64-bit floats and use NaN as a way to send non-numeric values
to Zig (NaN-boxing).

NaN in IEEE 754 encoding is `0111_1111_1111_<anything but all 0s>` in binary.
We use a common NaN value of `0111_1111_1111_1000_0000...` so that we can use
the bottom (least-significant) 49 bits to store type information and
a 32-bit ID.

The 32-bit ID is just an index into an array on the JS side. A simple scheme
is used to reuse IDs after they're dereferenced.

## Performance

Usage of this package causes the WASM/JS boundary to be crossed a LOT
and this is generally not very fast and not an optimal way to use wasm.
The optimal way to use WASM is more like a GPU: have the host (or wasm
module) preload a bunch of work into a byte buffer and send it over
in one single call. However, this approach is pretty painful.
This packge makes interfacing with JS very, very easy. Consider the
tradeoffs and choose what is best for you.

## Development

### JavaScript & Zig bridge

#### `JsRef`

We need a way to pass references to JavaScript-owned values into WebAssembly code. We do that with handles. The Zig (WASM) code also wants to know the type of the value that it received 99% of the time so it's often good to pass a handle & type pair whenever passing a reference to a JavaScript-owned value. The

There are six WebAssembly fundamental types: `u32`, `i32`, `u64`, `i64`, `f32`, and `f64`. All of them map to JavaScript `number` types with the exception of `u64` and `i64` which map to `bigint`. JavaScript has a maximum array size of $2^{32}$. To support both `wasm32` (the default) and `wasm64` (newfangled) we 

```ts
type u32 = number;
type u64 = bigint;
type f32 = number;
type f64 = number;

/**
 * @param v Packed 2x u32 JS-side index and typeof enum
 */
function finalizeRef(v: u64);

/**
 * @param value Zig-side pointer-first fat pointer to Zig-side `[]const u8` string
 * @returns Packed 2x u32 JS-side index and typeof enum
 */
function stringVal(value: u64): u64;

/**
 * @param valuePtr Zig-side pointer to Zig-side `[]const u8` string
 * @param valueLen Length of the pointed to Zig-side slice
 */
function stringVal64(valuePtr: u64, valueLen: u64): u64;

/**
 * @param v Packed 2x u32 JS ref index & typeof
 * @param p Zig-side pointer-first 2x u32 to Zig-owned `[]const u8` string
 * @returns Packed 2x u32 index + typeof JS ref
 */
function valueGet(v: u64, p: u64): u64;

/**
 * @param v JS-side index & typeof packed u32
 * @param pPtr Zig memory pointer to `[]const u8` string
 * @param pLen Length of the `[]const u8` string of `pPtr`
 * @returns JS ref index + typeof
 */
function valueGet64(v: u64, pPtr: u64, pLen: u64): u64;
```
