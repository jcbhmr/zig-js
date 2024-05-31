import { Zig } from "./zig_wasm_exec.js"
import process from "node:process";
import * as fs from "node:fs";
import test from "node:test"
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import assert from "node:assert/strict"

// https://github.com/jcbhmr/fetch-with-file-support
const { fetch: globalThisFetch, Request, Response, Headers } = globalThis;
async function fetch(input, init = {}) {
    const request = input instanceof Request && !init ? input : new Request(input, init);
    if (request.url.startsWith("file:")) {
        if (request.method === "GET") {
            let readable;
            try {
                readable = Readable.toWeb(createReadStream(new URL(request.url)));
            }
            catch (error) {
                throw new TypeError("NetworkError when attempting to fetch resource");
            }
            return new Response(readable);
        }
        else {
            throw new TypeError(`Fetching files only supports the GET method. ` +
                `Recieved ${request.method}.`);
        }
    }
    else {
        return await globalThisFetch(request);
    }
}

test("print argv & env", async () => {
    const zig = new Zig({ fs, process });
    let { module, instance } = await WebAssembly.instantiateStreaming(
        fetch(import.meta.resolve("./zig_test.wasm")),
        zig.importObject,
    );
    await zig.run(instance);
})

test("read & write globals", async () => {
    globalThis.README_WRITEME = "Set from JavaScript.";
    const zig = new Zig({ fs, process });
    let { module, instance } = await WebAssembly.instantiateStreaming(
        fetch(import.meta.resolve("./zig_test.wasm")),
        zig.importObject,
    );
    await zig.run(instance);
    assert.equal(globalThis.README_WRITEME, "Changed from Zig!");
})
