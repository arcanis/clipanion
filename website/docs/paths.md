---
id: paths
title: Command Paths
---

By default Clipanion mounts all commands as top-level, meaning that they are selected for execution from the very first token in the command line. This is typically what you want if you build a Posix-style tool, like `cp` or `curl`, but not when building a CLI application, like `yarn` or `react-native`.

To help with that, Clipanion supports giving each command one or multiple *paths*. A path is a list of fixed strings that must be found in order for the command to be selected as an execution candidate. Paths are declared using the static `paths` property from each command class:

```ts
class InstallCommand extends Command {
    static paths = [[`install`], [`i`]];
    async execute() {
        // ...
    }
}
```

In the example above, we declared a command that accepts any of two paths: `install`, or `i`. If we wanted the command to also trigger when *no* path is set (just like the default behavior), we'd use the `Command.Default` special path:

```ts
class InstallCommand extends Command {
    static paths = [[`install`], [`i`], Command.Default];
    async execute() {
        // ...
    }
}
```

:::tip
You could also use an empty array instead of the `Command.Default` helper, but using the provided symbol is a good way to clearly signal to the reader that a command is also an entry point.
:::

## Path Overlaps

It's possible for a path to overlap another one, as long as they aren't strictly identical:

```ts
class FooCommand extends Command {
    static paths = [[`foo`]];
    async execute() {
        // ...
    }
}

class FooBarCommand extends Command {
    static paths = [[`foo`, `bar`]];
    async execute() {
        // ...
    }
}
```

Clipanion will property execute `FooBarCommand` when running `foo bar`, and `FooCommand` when running just `foo`. You can even declare positional arguments on `FooCommand` if you want, which will get picked up as long as they don't match `bar`!

:::tip
You can even have multiple commands that have identical paths but different options, as long as the user specifies an option unique to one of them when invoking the command! The only caveat is that if they don't Clipanion won't know which version to use and will throw a `AmbiguousSyntaxError`.
:::
