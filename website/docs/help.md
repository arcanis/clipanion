---
id: help
title: Help command
---

Clipanion includes tools to allow documenting and adding a help functionality easily.

## The `usage` member

Commands have a `usage` static member that documents the command.
It contains a category, to group similar commands, a small and log description, and examples.
Unless a usage has been specified, the command is considered hidden and not shown to users.

```ts
import { Cli, Command, Option } from "clipanion";

export class HelloCommand extends Command {
  static paths = [[`my-command`]];
  static usage = {
    category: `My category`,
    description: `A small description of the command.`,
    details: `A longer description of the command.`,
    examples: [
      [`A basic example`, `$0 my-command`],
      [`A second example`, `$0 my-command --with-parameter`],
    ],
  };

  p = Option.Boolean(`--with-parameter`);

  async execute() {
    this.context.stdout.write(
      this.p ? `Called with parameter` : `Called without parameter`
    );
  }
}
```

## The help command

The builtin help command allows to get help about any documented command. To add it, simply import and register it.

```ts
import { Cli, Builtins } from "clipanion";

const cli = new Cli({
  binaryName: "my-app",
  binaryLabel: "My Application",
  binaryVersion: `1.0.0`,
}
});
cli.register(Builtins.HelpCommand);
```

:::danger
Be careful when adding this command, it will conflict with any command that has a `-h` or `--help` flag and make it throw an `AmbiguousSyntaxError`!
:::

Now, appending the flag `-h` or `--help` to a command with the `usage` property defined will show its documentation:

```
my-app my-command -h
    => ━━━ Usage ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

       $ my-app my-command [--with-parameter]

       ━━━ Details ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

       A longer description of the command.

       ━━━ Examples ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

       A basic example
         $ my-app my-command

       A second example
         $ my-app my-command --with-parameter
```

Those documented commands will also show up on the global help:

```
my-app -h
    => ━━━ My Application - 1.0.0 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

         $ my-app <command>

       ━━━ My category ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

         my-app my-command [--with-parameter]
           A small description of the command.

```
