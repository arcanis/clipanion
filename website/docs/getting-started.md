---
id: getting-started
title: Getting Started
---

## Installation

Add Clipanion to your project using Yarn:

```bash
yarn add clipanion
```

## Your first command

Create a command file, let's say `HelloCommand.ts` (we'll be using TypeScript here, but it's mostly the same if you use regular JavaScript, perhaps with the exception of the import style):

```ts twoslash
import {Command, Option} from 'clipanion';

export class HelloCommand extends Command {
  name = Option.String();

  async execute() {
    this.context.stdout.write(`Hello ${this.name}!\n`);
  }
}
```

That's it for your first command. You just have declare a class, extend from the base `Command` class, declare your options as regular properties, and implement an `async execute` member function.

:::info
Note that `execute` is using `this.context.stdout.write` rather than `console.log`. While optional, keeping this convention can be seen as a good practice, allowing commands to call each other while buffering their outputs.
:::

## Execute your CLI

Commands can be called by passing them to the `runExit` function:

```ts twoslash
import {Command, Option, runExit} from 'clipanion';

runExit(class HelloCommand extends Command {
  name = Option.String();

  async execute() {
    this.context.stdout.write(`Hello ${this.name}!\n`);
  }
});
```

Alternatively, you can construct the CLI instance itself, which is what `runExit` does:

```ts twoslash
import {Command} from 'clipanion';

class HelloCommand extends Command {
  async execute() {}
}

// ---cut---

import {Cli} from 'clipanion';

const [node, app, ...args] = process.argv;

const cli = new Cli({
    binaryLabel: `My Application`,
    binaryName: `${node} ${app}`,
    binaryVersion: `1.0.0`,
})

cli.register(HelloCommand);
cli.runExit(args);
```

## Registering multiple commands

You can add multiple commands to your CLI by giving them different `paths` static properties. For example:

```ts twoslash
import {Command, Option, runExit} from 'clipanion';

runExit([
  class AddCommand extends Command {
    static paths = [[`add`]];

    name = Option.String();

    async execute() {
      this.context.stdout.write(`Adding ${this.name}!\n`);
    }
  },

  class RemoveCommand extends Command {
    static paths = [[`remove`]];

    name = Option.String();

    async execute() {
      this.context.stdout.write(`Removing ${this.name}!\n`);
    }
  },
]);
```