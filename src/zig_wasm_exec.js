function enosys() {
    const err = new Error("not implemented");
    err.code = "ENOSYS";
    return err;
};

let outputBuf = "";
const fs = globalThis.fs ?? {
    constants: { O_WRONLY: -1, O_RDWR: -1, O_CREAT: -1, O_TRUNC: -1, O_APPEND: -1, O_EXCL: -1 },
    writeSync(fd, buf) {
        outputBuf += decoder.decode(buf);
        const nl = outputBuf.lastIndexOf("\n");
        if (nl != -1) {
            console.log(outputBuf.substring(0, nl));
            outputBuf = outputBuf.substring(nl + 1);
        }
        return buf.length;
    },
    write(fd, buf, offset, length, position, callback) {
        if (offset !== 0 || length !== buf.length || position !== null) {
            callback(enosys());
            return;
        }
        const n = this.writeSync(fd, buf);
        callback(null, n);
    },
    chmod(path, mode, callback) { callback(enosys()); },
    chown(path, uid, gid, callback) { callback(enosys()); },
    close(fd, callback) { callback(enosys()); },
    fchmod(fd, mode, callback) { callback(enosys()); },
    fchown(fd, uid, gid, callback) { callback(enosys()); },
    fstat(fd, callback) { callback(enosys()); },
    fsync(fd, callback) { callback(null); },
    ftruncate(fd, length, callback) { callback(enosys()); },
    lchown(path, uid, gid, callback) { callback(enosys()); },
    link(path, link, callback) { callback(enosys()); },
    lstat(path, callback) { callback(enosys()); },
    mkdir(path, perm, callback) { callback(enosys()); },
    open(path, flags, mode, callback) { callback(enosys()); },
    read(fd, buffer, offset, length, position, callback) { callback(enosys()); },
    readdir(path, callback) { callback(enosys()); },
    readlink(path, callback) { callback(enosys()); },
    rename(from, to, callback) { callback(enosys()); },
    rmdir(path, callback) { callback(enosys()); },
    stat(path, callback) { callback(enosys()); },
    symlink(path, link, callback) { callback(enosys()); },
    truncate(path, length, callback) { callback(enosys()); },
    unlink(path, callback) { callback(enosys()); },
    utimes(path, atime, mtime, callback) { callback(enosys()); },
};
const process = globalThis.process ?? {
    getuid() { return -1; },
    getgid() { return -1; },
    geteuid() { return -1; },
    getegid() { return -1; },
    getgroups() { throw enosys(); },
    pid: -1,
    ppid: -1,
    umask() { throw enosys(); },
    cwd() { throw enosys(); },
    chdir() { throw enosys(); },
}

/** @enum */
const TypeId = {
    NONE: 0,
    OBJECT: 1,
    STRING: 2,
    SYMBOL: 3,
    FUNCTION: 4,
    0: "NONE",
    1: "OBJECT",
    2: "STRING",
    3: "SYMBOL",
    4: "FUNCTION",
};

export class Zig {
    argv = ["js"]
    env = {};
    /** @type {WebAssembly.Instance | null} */
    #instance = null;
    /** @type {(() => void)} */
    #resolveExitPromise;
    #exitPromise = new Promise((resolve) => {
        this.#resolveExitPromise = resolve;
    });
    /** @type {any[]} */
    #values = []
    /** @type {number[]} */
    #idPool = [];
    exited = false;
    /** @type {DataView | null} */
    mem = null

    /** @param {{ fs: object; process: object; }} [runtimeContext] */
    constructor(runtimeContext = { fs, process }) {
        this.fs = fs;
        this.process = process;
    }

    exit = (code) => {
        if (code !== 0) {
            console.warn("exit code: %o", code)
        }
    }

    importObject = {
        "zigjs": {
            /**
             * @param {number} vJSHandle
             * @param {number} vType
             */
            finalizeRef: (vJSHandle, vType) => {
                const v = this.#values[vJSHandle]
                delete this.#values[vJSHandle];
                this.#idPool.push(vJSHandle);
            },

            /**
             * @param {number} valueZigPtr
             * @param {number} valueLen
             * @param {number} outZigPtr
             */
            stringVal: (valueZigPtr, valueLen, outZigPtr) => {
                const jsString = this.#loadString(valueZigPtr, valueLen);
                this.#storeValue(outZigPtr, jsString);
            },
        },
    };


    #loadValue(jsHandle) {
        return this.#values[jsHandle]
    }

    #storeValue()

    /**
     * @param {number} ptr 
     * @param {number} len 
     */
    #loadString(zigPtr, len) {

    }

    /** @param {WebAssembly.Instance} instance */
    async run(instance) {
        
    }
}