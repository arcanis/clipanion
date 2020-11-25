---
id: contexts
title: Execution Contexts
---

In Clipanion commands have what we call a *context*. Under this fancy word is simply an user object that we forward to the commands during their execution. The default context is fairly simple:

```ts
interface BaseContext {
    stdin: Readable;
    stdout: Writable;
    stderr: Writable;
}
```

You can define your own contexts (that extend the default one) to pass more complex environment options such as the `cwd`, or the user auth token, or the configuration, or ...

## Context Switches

When calling the `this.cli` API, the `run` function takes a *partial* context object - contrary to the usual `cli.run` and `cli.runExit` functions, which require a full context. This partial context will then be applied on top of the current one, so forwarded commands will automatically inherit the context you don't override.

```ts
class BufferCommand extends Command {
    async execute() {
        const passThrough = new PassThrough();

        await this.cli.run([`other-command`], {
            stdout: passThrough,
        });
    }
}
```
