---
id: option
title: Option
---

The following functions allow you to define new options for your cli commands. They must be registered into each command via regular public class properties (private class properties aren't supported):

```ts
class MyCommand extends Command {
    flag = Option.Boolean(`--flag`);
}
```

## `Option.Array`

```ts
Option.Array(optionNames: string, default?: string[], opts?: {...})
```

| Option | type | Description |
| --- | --- | --- |
| `arity` | `number` | Number of arguments for the option |
| `description` | `string`| Short description for the help message |
| `hidden` | `boolean` | Hide the option from any usage list |

Specifies that the command accepts a set of string arguments. The `arity` parameter defines how many values need to be accepted for each item. If no default value is provided, the option will start as `undefined`.

```ts
class RunCommand extends Command {
    args = Option.Array(`--arg`);
    points = Option.Array(`--point`, {arity: 3});
    // ...
}
```

Generates:

```bash
run --arg value1 --arg value2
# => TestCommand {"args": ["value1", "value2"]}

run --point x y z --point a b c
# => TestCommand {"points": [["x", "y", "z"], ["a", "b", "c"]]}
```

## `Option.Boolean`

```ts
Option.Boolean(optionNames: string, default?: boolean, opts?: {...})
```

| Option | type | Description |
| --- | --- | --- |
| `description` | `string`| Short description for the help message |
| `hidden` | `boolean` | Hide the option from any usage list |

Specifies that the command accepts a boolean flag as an option. If no default value is provided, the option will start as `undefined`.

```ts
class TestCommand extends Command {
    flag = Option.Boolean(`--flag`);
    // ...
}
```

Generates:

```bash
run --flag
# => TestCommand {"flag": true}
```

## `Option.Counter`

```ts
Option.Counter(optionNames: string, default?: number, opts?: {...})
```

| Option | type | Description |
| --- | --- | --- |
| `description` | `string`| Short description for the help message |
| `hidden` | `boolean` | Hide the option from any usage list |

Specifies that the command accepts a boolean flag as an option. Contrary to classic boolean options, each detected occurence will cause the counter to be incremented. Each time the argument is negated (`--no-<name>`), the counter will be reset to `0`. If no default value is provided, the option will start as `undefined`.

```ts
class TestCommand extends Command {
    verbose = Option.Counter(`-v,--verbose`);
    // ...
}
```

Generates:

```bash
run -v
# => TestCommand {"verbose": 1}

run -vv
# => TestCommand {"verbose": 2}

run --verbose -v --verbose -v
# => TestCommand {"verbose": 4}

run --verbose -v --verbose -v --no-verbose
# => TestCommand {"verbose": 0}
```

## `Option.Proxy`

```ts
Option.Proxy(opts?: {...})
```

| Option | type | Description |
| --- | --- | --- |
| `required` | `number` | Number of required trailing arguments |

Specifies that the command accepts an infinite set of positional arguments that will not be consumed by the options of the `Command` instance. Use this decorator instead of `Command.Rest` when you wish to forward arguments to another command parsing them in any way. By default no arguments are required, but this can be changed by setting the `required` option.

```ts
class RunCommand extends Command {
    args = Option.Proxy();
    // ...
}
```

Generates:

```bash
run
# => TestCommand {"values": []}

run value1 value2
# => TestCommand {"values": ["value1", "value2"]}

run value1 --foo
# => TestCommand {"values": ["value1", "--foo"]}

run --bar=baz
# => TestCommand {"values": ["--bar=baz"]}
```

**Note:** Proxying can only happen once per command. Once triggered, a command can't get out of "proxy mode", all remaining arguments being proxied into a list. "Proxy mode" can be triggered in the following ways:

- By passing a positional or an option that doesn't have any listeners attached to it. This happens when the listeners don't exist in the first place.

- By passing a positional that doesn't have any *remaining* listeners attached to it. This happens when the listeners have already consumed a positional.

- By passing the `--` separator before an option that has a listener attached to it. This will cause Clipanion to activate "proxy mode" for all arguments after the separator, *without* proxying the separator itself. In all other cases, the separator *will* be proxied and *not* consumed by Clipanion.

## `Option.Rest`

```ts
Option.Rest(opts?: {...})
```

| Option | type | Description |
| --- | --- | --- |
| `required` | `number` | Number of required trailing arguments |

Specifies that the command accepts an unlimited number of positional arguments. By default no arguments are required, but this can be changed by setting the `required` option.

```ts
class RunCommand extends Command {
    values = Option.Rest();
    // ...
}
```

Generates:

```bash
run
# => TestCommand {"values": []}

run value1 value2
# => TestCommand {"values": ["value1", "value2"]}

run value1
# => TestCommand {"values": ["value1"]}

run
# => TestCommand {"values": []}
```

**Note:** Rest arguments are strictly positionals. All options found between rest arguments will be consumed as options of the `Command` instance. If you wish to forward a list of option to another command without having to parse them yourself, use `Command.Proxy` instead.

**Note:** Rest arguments can be surrounded by other *finite* *non-optional* positionals such as `Option.String({required: true})`. Having multiple rest arguments in the same command is however invalid.

**Advanced Example:**

```ts
class CopyCommand extends Command {
    sources = Option.Rest({required: 1});
    destination = Option.String();
    force = Option.Boolean(`-f,--force`);
    reflink = Option.String(`--reflink`, {tolerateBoolean: true});
    // ...
}
```

Generates:

```bash
run src dest
# => CopyCommand {"sources": ["src"], "destination": "dest"}

run src1 src2 dest
# => CopyCommand {"sources": ["src1", "src2"], "destination": "dest"}

run src1 --force src2 dest
# => CopyCommand {"sources": ["src1", "src2"], "destination": "dest", "force": true}

run src1 src2 --reflink=always dest
# => CopyCommand {"sources": ["src1", "src2"], "destination": "dest", "reflink": "always"}

run src
# => Invalid! - Not enough positional arguments.

run dest
# => Invalid! - Not enough positional arguments.
```

## `Option.String` (option)

```ts
Option.String(optionNames: string, default?: string, opts?: {...})
```

| Option | type | Description |
| --- | --- | --- |
| `arity` | `number` | Number of arguments for the option |
| `description` | `string`| Short description for the help message |
| `hidden` | `boolean` | Hide the option from any usage list |
| `tolerateBoolean` | `boolean` | Accept the option even if no argument is provided |

Specifies that the command accepts an option that takes arguments (by default one, unless overriden via `arity`). If no default value is provided, the option will start as `undefined`.

```ts
class TestCommand extends Command {
    arg = Option.String(`-a,--arg`);
    // ...
}
```

Generates:

```bash
run --arg value
run --arg=value
run -a value
run -a=value
# => TestCommand {"arg": "value"}

run --arg=-42
# => TestCommand {"arg": "-42"}

run --arg -42
# => Invalid! Option `-42` doesn't exist.
```

Be careful, by default, options that accept an argument must receive one on the CLI (ie `--foo --bar` wouldn't be valid if `--foo` accepts an argument).

This behaviour can be toggled off if the `tolerateBoolean` option is set. In this case, the option will act like a boolean flag if it doesn't have a value. Note that with this option on, arguments values can only be specified using the `--foo=ARG` syntax, which makes this option incompatible with arities higher than one.

```ts
class TestCommand extends Command {
    debug = Option.String(`--inspect`, {tolerateBoolean: true});
    // ...
}
```

Generates:

```bash
run --inspect
# => TestCommand {"debug": true}

run --inspect=1234
# => TestCommand {"debug": "1234"}

run --inspect 1234
# Invalid!
```

## `Option.String` (positional)

```ts
Option.String(opts: {...})
```

| Option | type | Description |
| --- | --- | --- |
| `required` | `boolean` | Whether the positional argument is required or not |

Specifies that the command accepts a positional argument. By default it will be required, but this can be toggled off using `required`.

```ts
class TestCommand extends Command {
    foo = Option.String();
    // ...
}
```

Generates:

```bash
run value
# => TestCommand {"foo": "value"}
```

Note that Clipanion supports required positional arguments both at the beginning and the end of the positional argument list (which allows you to build CLI for things like `cp`). For that to work, make sure to list your arguments in the right order:

```ts
class TestCommand extends Command {
    foo = Option.String({required: false});
    bar = Option.String();
    // ...
}
```

Generates:

```bash
run value1 value2
# => TestCommand {"foo": "value1", "bar": "value2"}

run value
# => TestCommand {"foo": undefined, "bar": "value"}

run
# Invalid!
```
