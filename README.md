# Zig JavaScript platform

🟨 JavaScript-specific variant of the Zig standard library

<table align=center><td>

```zig
const std = @import("std");
const js = @import("js");

pub fn main() !void {
    const path = js.os.javascript.valueOf("file.txt");
    js.os.javascript.fs.readFile();
}
```

</table>

## Installation

```sh
zig fetch --save https://github.com/jcbhmr/zig-javascript/v0.0.0.tar.gz
```

## Usage

```zig
const std = @import("std");
const javascript = @import("javascript");
```

## Development
