---
id: builtins
title: Builtins
---

The following commands may be useful in some contexts, but not necessarily all of them. For this reason you must explicitly register them into your cli:

```ts
cli.registerCommand(Builtins.Help);
```

## `Builtins.Definitions`

Command triggered by running the tool with the `--clipanion=definitions` flag as unique argument. When called, it will print on the standard output the full JSON specification for the current cli. External tools can then use this information to generate documentation for other media (for example we use this to generate the Yarn CLI documentation).

## `Builtins.Help`

Command triggered by running the tool with the `-h,--help` flag as unique argument. When called, it will print the list of all available commands on the standard output (minus the hidden ones).

## `Builtins.Version`

Command triggered by running the tool with the `--version` flag as unique argument. When called, it will print the value of the `binaryVersion` field.