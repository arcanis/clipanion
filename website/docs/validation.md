---
id: validation
title: Command Validation
---

While static types go a long way towards stable CLIs, you often need a tighter control on the parameters your users will feed to your command line. For this reason, Clipanion provides an automatic (and optional) integration with [Typanion](https://github.com/arcanis/typanion), a library providing both static and runtime input validations and coercions.

## Validating Options

The `Option.String` declarator accepts a `validator` option. You can use it with the Clipanion predicates to enforce a specific shape for your option:

```ts
import * as t from 'typanion';

class PowerCommand {
    a = Option.String({validator: t.isNumber()});
    b = Option.String({validator: t.isNumber()});

    async execute() {
        this.context.stdout.write(`${this.a ** this.b}\n`);
    }
}
```

As you can see, TypeScript correctly inferred that both `this.a` and `this.b` are numbers (coercing them from their original strings), and passing anything else at runtime will now trigger validation errors.

## Validating Commands

While option-level validation is typically enough, in some cases you need to also enforce constraints in your application about the final shape. For instance, imagine a command where `--foo` cannot be used if `--bar` is used. For this kind of requirements, you can leverage the `static schema` declaration:

```ts
import * as t from 'typanion';

class MyCommand extends Command {
    foo = Command.Boolean(`--foo`, false);
    bar = Command.Boolean(`--bar`, false);

    static schema = [
        t.hasMutuallyExclusiveKeys([`foo`, `bar`], t.isLiteral(true)),
    ];
}
```

This schema will be run before executing the command, and will ensure that if any of `foo` and `bar` is true, then the other necessarily isn't.
