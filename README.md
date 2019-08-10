<img src="./logo.svg" width="100" />

# Clipanion

> A companion to manage your CLI applications without hassle

[![](https://img.shields.io/npm/v/clipanion.svg)]() [![](https://img.shields.io/npm/l/clipanion.svg)]()

## Installation

```
yarn add clipanion
```

## Why

  - Clipanion supports better typing than its competitor (particularly useful to detect unused or undeclared options at compile time)
  - Clipanion supports both simple CLI and more complex ones with multiple level of commands (for example `yarn constraints fix`)
  - Clipanion supports proxy commands (for example `yarn run eslint --help`, where `--help` is an option that must be forwarded to `eslint`, not consumed by `yarn run`)
  - Clipanion supports a bunch of option types: boolean, batches (`-lhS`), with arguments (`-x VAL`), arrays (`-x VAL1 -x VAL2`), negations (`--no-optionals`), ...
  - Clipanion supports parameter validation for when the default cohercion isn't enough (using [Yup](https://github.com/jquense/yup))
  - Clipanion generates good-looking help pages

Clipanion is used in [Yarn](https://github.com/yarnpkg/berry) with great success.

## Recommended Usage

**Note:** This syntax assumes you have some way to compile decorators. TypeScript supports them via the `experimentalDecorators` setting, and Babel via the `@babel/plugin-proposal-decorators` plugin.

```ts
import {Cli, Command, Context} from 'clipanion';
import * as yup from 'yup';

class GreetCommand extends Command {
    @Command.Boolean(`-v,--verbose`)
    public verbose: boolean = false;

    @Command.String(`--name`)
    public name?: string;

    @Command.Path(`greet`)
    async execute(cli: Cli, context: Context) {
        if (typeof this.name === `undefined`) {
            context.stdout.write(`You're not registered.\n`);
        } else {
            context.stdout.write(`Hello, ${this.name}!\n`);
        }
    }
}

@Command.Validate(yup.object().shape({
    a: yup.number().integer(),
    b: yup.number().integer(),
}))
class FibonacciCommand extends Command {
    @Command.String({required: true})
    public a!: number;

    @Command.String({required: true})
    public b!: number;

    @Command.Path(`fibo`)
    async execute(cli: Cli, context: Context) {
        // ...
    }
}

const cli = new Cli({
    binaryLabel: `My Utility`,
    binaryName: `bin`,
    binaryVersion: `1.0.0`,
});

cli.register(GreetCommand);
cli.register(FibonacciCommand);

cli.runExit(process.argv.slice(2));
```

## Fallback Usage

In case the primary syntax isn't available (for example because you want to avoid any kind of transpilation), a fallback syntax is available:

```js
class GreetCommand extends Command {
    async execute(cli, context) {
        // ...
    }
}

GreetCommand.addPath(`greet`);

GreetCommand.addOption(`boolean`, Command.Boolean(`-v,--verbose`));
GreetCommand.addOption(`name`, Command.String(`--name`));
```

Note that in this case the option variables never get assigned default values, so they may be undefined within the `execute` block.

## Command Help Pages

Clipanion automatically adds support for the `-h` option to all the commands that you define. The information printed will come from the `usage` property attached to the class. For example, the following command:

```ts
class YarnAdd extends Command {
    static usage = Command.Usage({
        description: `remove dependencies from the project`,
        details: `
            This command will remove the specified packages from the current workspace. If the \`-A,--all\` option is set, the operation will be applied to all workspaces from the current project.
        `,
        examples: [[
            `Remove a dependency from the current project`,
            `yarn remove lodash`,
        ], [
            `Remove a dependency from all workspaces at once`,
            `yarn remove lodash --all`,
        ]],
    });
}
```

Will generate something like this:

![](assets/example-command-help.png)

Note that the inline code blocks will be automatically highlighted.

## General Help Page

In order to support using the `-h` option to list the commands available to the application, just register a new command as such:

```ts
class HelpCommand extends Command {
  @Command.Path(`--help`)
  @Command.Path(`-h`)
  async execute() {
    this.context.stdout.write(this.cli.usage(null));
  }
}
```

This will print a block similar to the following:

![](assets/example-general-help.png)

## Composition

Commands can call each other by making use of their `cli` property:

```
class FooCommand extends Command {
    @Command.Path(`foo`)
    async execute() {
        this.context.stdout.write(`Hello World\n`);
    }
}

class BarCommand extends Command {
    @Command.Path(`bar`)
    async execute() {
        this.cli.run([`foo`]);
    }
}
```

## Contexts

Commands share what is called a *context*. Contexts are a set of values defined when calling the `run` function from the CLI instance that will be made available to the commands via `this.context`. The default context contains properties for `stdin`, `stdout`, and `stderr`, but you can easily define a custom context that extends the default one:

```ts
import {BaseContext, Command} from 'clipanion';

type MyContext = BaseContext & {
    cwd: string;
};

class PwdCommand extends Command<MyContext> {
    async execute() {
        this.context.stdout.write(`${this.context.cwd}\n`);
    }
}

const cli = Cli.from<MyContext>([
    PwdCommands,
]);

cli.runExit(process.argv.slice(2), {
    cwd: process.cwd(),
    stdin: process.std,
    stdout: process.stdout,
    stderr: process.stderr,
});
```

Note that the context must be fully defined when calling `run` and `runExit` on the main CLI instance, but can be omitted or only partially specified when using `this.cli.run` (in which case only the specified fields will be changed).

## License (MIT)

> **Copyright © 2019 Mael Nison**
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
