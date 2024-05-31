const std = @import("std");
const builtin = @import("builtin");

comptime {
    std.debug.assert(builtin.target.isWasm());
}

const zigjs = if (usize == u32) struct {
    /// Release all references to this value on the JavaScript side since the Zig side has .deinit()-ed the value.
    /// 
    /// v: Ref as u64
    pub extern "zigjs" fn finalizeRef(v: u64) void;

    /// Stash a Zig side string value ([]const u8) into a JavaScript side string and return the ref.
    /// 
    /// value: (len << 32) & ptr
    /// returns: Ref as u64
    pub extern "zigjs" fn stringVal(value: u64) f32;

    /// Access a property on a JavaScript side ref
    /// 
    /// v: Ref as u64
    /// p: Zig side string value ([]const u8) as (len << 32) & ptr
    pub extern "zigjs" fn valueGet(v: u64, p: u64) u64;


    /// returns: boolean of whether or not setting threw an error
    pub extern "zigjs" fn valueSet(v: u64, p: u64, x: u64) u32;

    /// Call a JavaScript side ref as a function with the given ref arguments.
    /// 
    /// v: Ref as u64
    /// m: (len << 32) & ptr Zig side string
    /// args: (len << 32) & ptr Zig side []Value slice
    /// returns: RetRef as u64
    pub extern "zigjs" fn valueCall(v: u64, m: u64, args: u64) u64;

    /// Directly invoke a JavaScript side ref as a function with the given ref arguments.
    /// 
    /// v: Ref as u64
    /// args: (len << 32) & ptr Zig side []Value slice
    /// returns: RetRef as u64
    pub extern "zigjs" fn valueInvoke(v: u64, args: u64) u64;

    /// Get the last thrown JavaScript side error. Use this after receiving a RetRef that indicates the function threw an error.
    /// 
    /// returns: Ref as u64
    pub extern "zigjs" fn getErrnoRef() u64;
} else if (usize == u64) struct {
    
} else unreachable;

const nanHead = 0x7FF80000;

const TypeId = enum(u3) {
    none = 0,
    object = 1,
    string = 2,
    symbol = 3,
    function = 4,
};

var noncomparableNext = 1;
fn getNoncomparableNext() u32 {
    const v = noncomparableNext;
    noncomparableNext += 1;
    return v;
}

pub const Value = struct {
    _noncomparable: u32 = getNoncomparableNext(),
    _id: u32,
    _type: TypeId = .none, // u3
    _nanHead: u29 = nanHead, // u3 + u29 = u32

    pub fn get(self: Value, p: []const u8) !Value {
        if (self.getType().isObject()) {
            return Value.fromRef(zigjs.valueGet(self.getRef(), @bitCast(p)));
        } else {
            return error.ValueError;
        }
    }

    pub fn @"bool"(self: Value) !bool {
        if (self._id == valueTrue._id and self._type == valueTrue._type) {
            return true;
        } else if (self._id == valueFalse._id and self._type == valueFalse._type) {
            return false;
        } else {
            return error.ValueError;
        }
    }

    pub fn call(self: Value, m: []const u8, args: []const Value) !Value {
        _ = self;
        _ = m;
        _ = args;
        return error.ValueError;
    }
};

// SYNC WITH zig_wasm_exec.js
const valueUndefined = Value{ ._id = 0, ._nanHead = 0 };
const valueNan = Value{ ._id = 0, ._type = .none };
const valueZero = Value{ ._id = 1, ._type = .none };
const valueNull = Value{ ._id = 2, ._type = .none };
const valueTrue = Value{ ._id = 3, ._type = .none };
const valueFalse = Value{ ._id = 4, ._type = .none };
const valueGlobal = Value{ ._id = 5, ._type = .object };
const valueZig = Value{ ._id = 6, ._type = .object };

const objectConstructor = valueGlobal.get("Object") catch @panic("no 'Object' on 'globalThis");
const arrayConstructor = valueGlobal.get("Array") catch @panic("no 'Array' on 'globalThis'");

pub const @"null" = valueNull;
pub const global = valueGlobal;

pub const Type = enum(i32) {
    undefined,
    null,
    boolean,
    number,
    string,
    symbol,
    object,
    function,

    fn isObject(self: Type) bool {
        return self == .object or self == .function;
    }
};

pub fn copyBytesToZig(dst: []u8, src: Value) !void {
    dst
}
