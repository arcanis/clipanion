---
id: tips
title: Tips & Tricks
---

## Inheritance

Because they're just plain old ES6 classes, commands can easily extend each other and inherit options:

```ts
abstract class BaseCommand extends Command {
    cwd = Command.String(`--cwd`, {hidden: true});

    abstract execute(): Promise<number | void>;
}

class FooCommand extends BaseCommand {
    foo = Command.String(`-f,--foo`);

    async execute() {
        this.context.stdout.write(`Hello from ${this.cwd ?? process.cwd()}!\n`);
        this.context.stdout.write(`This is foo: ${this.foo}.\n`);
    }
}
```

Positionals can also be inherited. They will be consumed in order starting from the superclass:

```ts
abstract class BaseCommand extends Command {
    foo = Command.String();

    abstract execute(): Promise<number | void>;
}

class FooCommand extends BaseCommand {
    bar = Command.String();

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

## Lazy evaluation

Many commands have the following form:

```ts
import {uniqBy} from 'lodash';

export class MyCommand extends Command {
    async execute() {
        // ...
    }
}
```

While it works just fine, if you have a lot of commands that each have their own sets of dependencies (here `lodash`), the overall startup time may suffer. This is because the `import` statements will always be eagerly evaluated, even if the command doesn't end up being selected for execution.

To solve this problem you can move your imports inside the body of the `execute` function - thus making sure they'll only be evaluated if actually relevant:

```ts
export class MyCommand extends Command {
    async execute() {
        const {uniqBy} = await import(`lodash`);
        // ...
    }
}
```

This strategy is slightly harder to read, so it may not be necessary in every situation. If you like living on the edge, the [`babel-plugin-lazy-import`](https://github.com/arcanis/babel-plugin-lazy-import) plugin is meant to automatically apply this kind of transformation - although it requires you to run Babel on your sources.
