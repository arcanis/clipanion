---
id: cli
title: Cli
---

The `Cli` class is the main way you'll interact with your cli.

## `new Cli`

```ts
new Cli(opts: {...})
```

| Option | type | Description |
| --- | --- | --- |
| `binaryLabel` | `string` | Tool name, as shown in the help message |
| `binaryName` | `string`| Binary name, as shown in the usage line |
| `binaryVersion` | `string` | Tool version, as shown in `--version` |
| `enableColors` | `boolean` | Overrides the automatic color detection for error messages |

## `Cli#process`

```ts
cli.process(input: string[])
```

Turn the given arguments into a partially hydrated command instance. Don't call `execute` on it, as some fields must still be set before the command can be truly executed. Instead, pass it forward to `Cli#run` if you wish to truly execute it.

## `Cli#run`

```ts
cli.run(input: Command, context: Context)
cli.run(input: string[], context: Context)
```

Turn the given argument into a command that will be immediately executed and returned. If an error happens during execution `Cli#run` will catch it and resolve with an exit code 1 instead.

## `Cli#runExit`

```ts
cli.run(input: string[], context: Context)
```

Same thing as `Cli#run`, but catches the result of the command and sets `process.exitCode` accordingly. Note that it won't directly call `process.exit`, so the process may stay alive if the event loop isn't empty.
