---
id: contexts
title: Execution Contexts
---

In Clipanion commands have what we call a *context*. Under this fancy word is simply an arbitrary object that we provide to all commands via `this.context` during their execution. The default context is fairly simple:

```ts twoslash
import type {Readable, Writable} from 'stream';

interface BaseContext {
    env: Record<string, string | undefined>;
    stdin: Readable;
    stdout: Writable;
    stderr: Writable;
    colorDepth: number;
}
```

You can define your own contexts (that extend the default one) to pass more complex environment options such as the `cwd`, or the user auth token, or the configuration, or ...

:::info
You may wonder why we keep streams in the context in the first place, rather than just use the classic `console.log` family of functions. This is because this way commands can easily intercept the output of other commands (for instance to capture their result in a buffer), which allows for better composition.
:::

:::tip
If you'd prefer for this to be automatically handled by Clipanion so that all writes to the `console.log` family are captured and forwarded to the right streams, add `enableCapture: true` to your CLI configuration. It even supports proper routing when multiple commands run in parallel!
:::

## Context Switches

When calling the `this.cli` API, the `run` function takes a *partial* context object - contrary to the usual `cli.run` and `cli.runExit` functions, which require a full context. This partial context will then be applied on top of the current one, so forwarded commands will automatically inherit the context you don't override.

```ts twoslash
import {Command} from 'clipanion';
// ---cut---
import {PassThrough} from 'stream';

class BufferCommand extends Command {
    async execute() {
        const passThrough = new PassThrough();

        await this.cli.run([`other-command`], {
            stdout: passThrough,
        });
    }
}
```
