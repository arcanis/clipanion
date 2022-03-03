---
id: validation
title: Command Validation
---

While static types go a long way towards stable CLIs, you often need a tighter control on the parameters your users will feed to your command line. For this reason, Clipanion provides an automatic (and optional) integration with [Typanion](https://github.com/arcanis/typanion), a library providing both static and runtime input validations and coercions.

## Validating Options

The `Option.String` declarator accepts a `validator` option. You can use it with the Clipanion predicates to enforce a specific shape for your option:

```ts twoslash
import {Command, Option} from 'clipanion';
// ---cut---
import * as t from 'typanion';

class PowerCommand extends Command {
    a = Option.String({validator: t.isNumber()});
    b = Option.String({validator: t.isNumber()});

    async execute() {
        this.context.stdout.write(`${this.a ** this.b}\n`);
    }
}
```

As you can see by hovering them, TypeScript correctly inferred that both `this.a` and `this.b` are numbers (coercing them from their original strings), and passing anything else at runtime will now trigger validation errors. You can apply additional rules by using the Typanion predicates, for example here to validate that something is a valid port:


```ts twoslash
import {Command, Option} from 'clipanion';
// ---cut---
import * as t from 'typanion';

const isPort = t.applyCascade(t.isNumber(), [
    t.isInteger(),
    t.isInInclusiveRange(1, 65535),
]);

class ServeCommand extends Command {
    port = Option.String({validator: isPort});

    async execute() {
        this.context.stdout.write(`Listening on ${this.port}\n`);
    }
}
```

## Validating Commands

While option-level validation is typically enough, in some cases you need to also enforce constraints in your application about the final shape. For instance, imagine a command where `--foo` cannot be used if `--bar` is used. For this kind of requirements, you can leverage the `static schema` declaration:

```ts twoslash
import {Command, Option} from 'clipanion';
// ---cut---
import * as t from 'typanion';

class MyCommand extends Command {
    foo = Option.Boolean(`--foo`, false);
    bar = Option.Boolean(`--bar`, false);

    static schema = [
        t.hasMutuallyExclusiveKeys([`foo`, `bar`]),
    ];

    async execute() {
        // ...
    }
}
```

This schema will be run before executing the command, and will ensure that if any of `foo` and `bar` is true, then the other necessarily isn't.

Note however that `schema` doesn't contribute to the type inference, so checking whether one value is set won't magically refine the type for the other values.
