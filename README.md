<img src="./logo.svg" width="100" />

# Clipanion

> A companion to manage your CLI applications without hassle

[![](https://img.shields.io/npm/v/clipanion.svg)]() [![](https://img.shields.io/npm/l/clipanion.svg)]()

## Installation

```
$> yarn add clipanion@2.0.0-rc.0
```

## Why

  - Clipanion supports both simple CLI and more complex ones with multiple level of commands (for example `yarn constraints fix`)
  - Clipanion supports proxy commands (for example `yarn run eslint --help`, where `--help` is an option that must be forwarded to `eslint`, not consumed by `yarn run`)
  - Clipanion supports a bunch of option types: boolean, counters (`-vv`), with arguments (`-x VAL`), arrays (`-x VAL ...`), negations (`--no-optionals`), ...
  - Clipanion supports parameter validation for when the default cohercion isn't enough (using [Yup](https://github.com/jquense/yup))
  - Clipanion generates good-looking help pages

Clipanion is used in [Yarn](https://github.com/yarnpkg/berry) with great success.

## Recommended Usage

**Note:** This syntax assumes you have some way to compile decorators. TypeScript supports them via the `experimentalDecorators` setting, and Babel via the `@babel/plugin-proposal-decorators` plugin.

```ts
import {Cli, Command, Context} from 'clipanion';
import * as yup                from 'yup';

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

const cli = new Cli({name: `test-bin`});

cli.register(GreetCommand);
cli.register(FibonacciCommand);

cli.runExit(process.argv.slice(2));
```

## License (MIT)

> **Copyright © 2019 Mael Nison**
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
