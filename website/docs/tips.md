---
id: tips
title: Tips & Tricks
---

## Inheritance

Because they're just plain old ES6 classes, commands can easily extend each other and inherit options:

```ts twoslash
import {Command, Option} from 'clipanion';
// ---cut---
abstract class BaseCommand extends Command {
    cwd = Option.String(`--cwd`, {hidden: true});

    abstract execute(): Promise<number | void>;
}

class FooCommand extends BaseCommand {
    foo = Option.String(`-f,--foo`);

    async execute() {
        this.context.stdout.write(`Hello from ${this.cwd ?? process.cwd()}!\n`);
        this.context.stdout.write(`This is foo: ${this.foo}.\n`);
    }
}
```

Positionals can also be inherited. They will be consumed in order starting from the superclass:

```ts twoslash
import {Command, Option} from 'clipanion';
// ---cut---
abstract class BaseCommand extends Command {
    foo = Option.String();

    abstract execute(): Promise<number | void>;
}

class FooCommand extends BaseCommand {
    bar = Option.String();

    async execute() {
        this.context.stdout.write(`This is foo: ${this.foo}.\n`);
        this.context.stdout.write(`This is bar: ${this.bar}.\n`);
    }
}
```

```
hello world
    => Command {"foo": "hello", "bar": "world"}
```

## Adding options to existing commands

Adding options to existing commands can be achieved via inheritance and required options:

```ts twoslash
import {Command, Option} from 'clipanion';
// ---cut---
class GreetCommand extends Command {
  static paths = [[`greet`]];

  name = Option.String();

  greeting = Option.String(`--greeting`, `Hello`);

  async execute(): Promise<number | void> {
    this.context.stdout.write(`${this.greeting} ${this.name}!\n`);
  }
}

class GreetWithReverseCommand extends GreetCommand {
  reverse = Option.Boolean(`--reverse`, {required: true});

  async execute() {
    return await this.cli.run([`greet`, this.reverse ? this.name.split(``).reverse().join(``) : this.name, `--greeting`, this.greeting]);
  }
}
```

```
greet john
    => "Hello john!\n"

greet john --greeting hey
    => "hey john!\n"

greet john --reverse
    => "Hello nhoj!\n"

greet john --greeting hey --reverse
    => "hey nhoj!\n"
```

:::danger
To add an option to an existing command, you need to know its `Command` class. This means that if you want to add 2 options by using 2 different commands (e.g. if your application uses different plugins that can register their own commands), you need one of the `Command` classes to extend the other one and not the base.
:::

## Lazy evaluation

Many commands have the following form:

```ts twoslash
import {Command} from 'clipanion';
// ---cut---
import {uniqBy} from 'lodash';

class MyCommand extends Command {
    async execute() {
        // ...
    }
}
```

While it works just fine, if you have a lot of commands that each have their own sets of dependencies (here `lodash`), the overall startup time may suffer. This is because the `import` statements will always be eagerly evaluated, even if the command doesn't end up being selected for execution.

Clipanion provides a solution via the experimental `Cli.lazyFileSystem` and `Cli.lazyTree` functions. The first one will dynamically load commands from the filesystem based on the arguments provided to the command:

```ts twoslash
import {Cli, runExit} from 'clipanion';
// ---cut---
runExit(Cli.lazyFileSystem({
    cwd: `${__dirname}/commands`,
    pattern: `{}.ts`,
}));
```

Whereas the second one allows you to statically define the list of commands that can be loaded, but defer their evaluation until they are needed. This strategy is a little more complex to use as you need to maintain the command list yourself, but it doesn't depend on the filesystem and thus work .

```ts
import {Cli, runExit} from 'clipanion';
// ---cut---
runExit(Cli.lazyTree({
    install: async () => import(`./commands/install`),
    config: {
        default: async () => import(`./commands/config`),
        get: async () => import(`./commands/config/get`),
        set: async () => import(`./commands/config/set`),
    },
}));
```

Another option is to move your imports inside the body of the `execute` function. This makes sure they'll only be evaluated if actually relevant:

```ts twoslash
import {Command} from 'clipanion';
// ---cut---
class MyCommand extends Command {
    async execute() {
        const {uniqBy} = await import(`lodash`);
        // ...
    }
}
```

This strategy is slightly harder to read, so it may not be necessary in every situation. If you like living on the edge, the [`babel-plugin-lazy-import`](https://github.com/arcanis/babel-plugin-lazy-import) plugin is meant to automatically apply this kind of transformation - although it requires you to run Babel on your sources.
