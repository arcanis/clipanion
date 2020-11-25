---
id: getting-started
title: Getting Started
---

First, add Clipanion to your project:

```bash
yarn add clipanion
```

Then create a command file, let's say `AdditionCommand.ts` (we'll be using TypeScript here, but it's mostly the same if you use regular JavaScript, with the exception of the import style):

```ts
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
Note that `execute` is using `this.context.stdout.write` rather than `console.log`. While optional, keeping this convention is a good practice as commands may want to call each other with different types of streams (for example to buffer the output of another command).
:::

Now that your command is ready, all you have to do is setup the CLI engine that will "serve" this command. To do that, import it from Clipanion and register your command into it:

```ts
import {Cli} from 'clipanion';

import {HelloCommand} from './HelloCommand';

const [node, app, ...args] = process.argv;

const cli = new Cli({
    binaryLabel: `My Application`,
    binaryName: `${node} ${app}`,
    binaryVersion: `1.0.0`,
})

cli.registerCommand(HelloCommand);
cli.runExit(args, Cli.defaultContext);
```
