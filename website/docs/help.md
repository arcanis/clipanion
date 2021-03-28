---
id: help
title: Help command
---

Clipanion includes tools to allow documenting and adding a help functionality easily.

## The `usage` member

Commands may define a `usage` static property that will be used to document the command. It must be an object with any of the following fields:

- `category` will be used to group commands in the global help listing
- `description` is a one-line description used in the global help listing
- `details` is a large description of your command, with paragraphs separated with `\n\n`
- `examples` is an array of `[description, command]` tuple

Note that commands are hidden from the global help listing by default unless a `usage` property has been specified.

```ts
import {Cli, Command, Option} from "clipanion";

export class HelloCommand extends Command {
  static paths = [
    [`my-command`],
  ];

  static usage = {
    category: `My category`,
    description: `A small description of the command.`,
    details: `
      A longer description of the command.
    `,
    examples: [[
      `A basic example`,
      `$0 my-command`,
    ], [
      `A second example`,
      `$0 my-command --with-parameter`,
    ]],
  };

  p = Option.Boolean(`--with-parameter`);

  async execute() {
    this.context.stdout.write(
      this.p ? `Called with parameter` : `Called without parameter`
    );
  }
}
```

```
$ my-app my-command -h
```

```
━━━ Usage ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$ my-app my-command [--with-parameter]

━━━ Details ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A longer description of the command.

━━━ Examples ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A basic example
  $ my-app my-command

A second example
  $ my-app my-command --with-parameter
```

## The `help` command

The builtin `help` command prints the list of available commands. To add it, simply import and register it:

```ts
import {Cli, Builtins} from "clipanion";

const cli = new Cli({
  binaryName: `my-app`,
  binaryLabel: `My Application`,
  binaryVersion: `1.0.0`,
});

cli.register(Builtins.HelpCommand);
```

```
$ my-app help
```

```
━━━ My Application - 1.0.0 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$ my-app <command>

━━━ My category ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

my-app my-command [--with-parameter]
  A small description of the command.
```
