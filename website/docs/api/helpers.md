---
id: helpers
title: Helpers
---

## `runExit` / `run`

```ts
run(opts?: {...}, commands: Command | Command[], argv?: string[], context?: Context)
runExit(opts?: {...}, commands: Command | Command[], argv?: string[], context?: Context)
```

Those functions abstracts the `Cli` class behind simple helpers, decreasing the amount of boilerplate you need to write when building small CLIs.

All parameters except the commands (and the [context](/docs/contexts), if you specify custom keys) are optional and will default to sensible values from the current environment.

Calling `run` will return a promise with the exit code that you'll need to handle yourself, whereas `runExit` will set the process exit code itself.
