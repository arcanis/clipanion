---
id: errors
title: Error Handling
---

Clipanion will catch by default all errors thrown by your application and print their stacktrace. If you wish to prevent the stacktrace from being printed, throw an instance of `UsageError` instead of the typical `Error`. Clipanion will then only display the provided message, along with the command usage line.

Note that while throwing an error (or a `UsageError`) sets the exit code to 1, it's different from just returning 1 as exit code. In the latter case, Clipanion won't display anything else than what you printed yourself.

As a rule of thumb:

- Throw an `Error` for unexpected internal errors such as failed assertions
- Throw a `UsageError` for errors caused by invalid options / environments
- Return 1 if the command is properly executed but something needs to be signaled to the caller (for example `grep` returning an error when no match is found, or a lint command when detecting errors while checking a file)

## Custom Error Handling

In some cases you may want to take control over what Clipanion does when a command throws. In that case, override the `catch` method when declaring your command:

```ts twoslash
import {Command} from 'clipanion';

export class HelloCommand extends Command {
  async execute() {
    throw new Error(`Hello world`);
  }
  
  async catch(error: unknown) {
    // You can do whatever you want here, like rethrow the original error
    throw error;
  }
}
```
