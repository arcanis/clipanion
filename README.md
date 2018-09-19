# [![](/logo.png?raw=true)](https://github.com/manaflair/concierge)

> Easily parse your command line options and commands

[![](https://img.shields.io/npm/v/@manaflair/concierge.svg)]() [![](https://img.shields.io/npm/l/@manaflair/concierge.svg)]()

[Check out our other OSS projects!](https://manaflair.github.io)

## Installation

```
$> npm install --save @manaflair/concierge
```

## Usage

```js
import { concierge } from '@manaflair/concierge';

concierge
    .topLevel(`[-v,--verbose]`);

concierge
    .command(`install [--production]`)
    .describe(`Install all packages located into your package.json`)
    .action(() => { /* ... */ });

concierge
    .command(`add <pkg-name> [... others-pkgs] [-D,--dev] [-P,--peer] [-O,--optional] [-E,--exact] [-T,--tilde]`)
    .describe(`Add a package to your package.json`)
    .action(() => { /* ... */ });

concierge
    .command(`remove <pkg-name> [... other-pkgs]`)
    .describe(`Remove a package from your package.json`)
    .action(() => { /* ... */ });

concierge
    .command(`info <pkg-name> [field] [--json]`)
    .describe(`Fetch informations about a package`)
    .action(() => { /* ... */ });

concierge
    .runExit(process.argv0, process.argv.slice(2));
```

## Standard options

Two options are standard and work without any interaction from your part:

  - `-h,--help` will automatically print the help, also available as `.usage()`
  - `-c,--config` will load a JSON file and use it as input once the command line has been fully read

It's not possible to disable them at the time.

## Patterns

Concierge automatically deduces command definitions from what we call patterns. A pattern syntax is as follow:

```
command-name <required-arg-1> <required-arg-2> [optional-arg-1] [... spread-name] [-s,--long-name ARGNAME]
```

Note that `command-name` is allowed to have multiple words, in which case the selected command will always be the command with the largest path that match your command line arguments.

The following patterns are all valid:

```
global add <pkg-name>         ; "global add" will be the command name, "pkg-name" will be a required argument
global add [pkg-name]         ; "global add" will be the command name, "pkg-name" will be an optional argument
global add [... args]         ; will accept any number of arguments, potentially zero
global add <first> [... rest] ; will require at least one argument, potentially more
install [-v]                  ; the "v" option will be true, false, or undefined
install [-vvv]                ; the "v" option will become a counter, from 0 to 3 included
install [-v,--verbose]        ; the "verbose" option will be true (--verbose), false (--no-verbose), or undefined
execute [--output TARGET...]  ; the "output" option will be an array of strings (empty if the option is never set)
download [-u,--url URL]       ; the "url" option will expect a parameter, or will be "null" if --no-url is used
download [--with-ssl]         ; the "ssl" option will be true (--with-ssl), false (--without-ssl), or undefined
command [-vqcarRbudlLkKHpE]   ; declare all those options at once
```

## Environments

Once all the command line arguments have been parsed, an environment object is generated, validated, and passed in the final command action callback. This environment is an object with the following properties:

  - Each key is a parameter name (whether it's a required or optional argument, or an option)
  - Each value is the value associated to the parameter
  - If an option has both a short name and a long name, only the long name will be registered

The environment values have the following properties, excluding any extra validator you may have set:

  - Required arguments are always of type string
  - Optional arguments are always either strings or undefined
  - Short options without arguments are always either true, undefined, or a number
  - Short options with arguments are always either a string or undefined
  - Long options without arguments are always either true, false, or undefined
  - Long options with arguments are always either an array of strings, a string, null, or undefined
  - Combinations of short and long options can be of any type at least one of them accepts

## Default command

Add the `defaultCommand` flag to your command:

```js
import { concierge, flags } from '@manaflair/concierge';

concierge
    .command(`install [--production]`)
    .describe(`Install all packages located into your package.json`)
    .flag({ defaultCommand: true })
    .action(() => { /* ... */ });
```

## Validation

Concierge optionally uses the [Joi](https://github.com/hapijs/joi) library to validate its data. You can easily plug in your own validators:

```js
import { concierge } from '@manaflair/concierge';
import Joi           from 'joi';

concierge
    .command(`server [-p,--port PORT]`)
    .describe(`Run a server on the specified port`)
    .validate(Joi.object().keys({ port: Joi.number().min(1).max(65535).default(8080) }).unknown())
    .action(() => { /* ... */ });

concierge
    .runExit(process.argv0, process.argv.slice(2));
```

Note that Joi will automatically coherce any value to its expected type if possible, so it is advised that you use it when your options expect arguments (so that you don't end up working with strings or booleans instead of numbers, for example).

## Command folder

You can split you cli into multiple files by using the `directory()` function:

```js
concierge
    .directory(`${__dirname}/commands`, true, /\.js$/);
```

It also works fine with Webpack:

```js
concierge
    .directory(require.context(`./commands`, true, /\.js$/));
```

However, in such a case it is advised to do the following, so that you can use your code without having to compile it through Webpack (useful if you want to dev your application using babel-node or similar):

```js
typeof IS_WEBPACK === `undefined` && concierge
    .directory(`${__dirname}/commands`, true, /\.js$/);

typeof IS_WEBPACK !== `undefined` && concierge
    .directory(require.context(`./commands`, true, /\.js$/));

// Don't forget to add "new DefinePlugin({ IS_WEBPACK: true })" in your webpack.config.js
```

## Daemon plugin

Concierge ships with an optional plugin that allows you to run your programs in a daemon mode. In order to use it, just use the `makeDaemon` function and you're ready to go:

```js
import { makeDaemon } from '@manaflair/concierge/extra/daemon';
import { concierge }  from '@manaflair/concierge';

const daemon = makeDaemon(concierge, {
    port: 4242
});

daemon.command(`init`)
    .action(() => { /*...*/ });

daemon.command(`hello [--name NAME]`)
    .action(() => { /*...*/ });

daemon
    .run(process.argv0, process.argv.slice(2));
```

Using the `makeDaemon` wrapper will automatically add a few commands to your application:

  - `start` will start a daemon, then will call its `init` command.
  - `status` will try to reach a daemon, and inform you whether it succeeds or fails.
  - `stop` will make the daemon exit after calling its `cleanup` command.
  - `restart` will restart the running daemon, with the exact same arguments.

You are expected to implement a few commands by yourself. They will automatically be hidden from the usage:

  - `init` will be called by `start` and `restart`, and should prepare everything needed for your application to be in valid state. The daemon will start only after this command returns.
  - `cleanup` will be called by `stop` and `restart`, and should clean everything needed. When it returns, the `start` command will return, usually ending the process.

Last important note: the current daemon implementation **is not secure by default**. Because it only listens to the localhost requests it should be impossible for an external attacker to execute requests on your server, however it is possible for any local user (ie people who have an account on the same machine) to send crafted requests to the daemon, that will then be executed with the privileges of the user that started the daemon. I have no idea how to fix this, so feel free to open an issue with your ideas if you happen to have one. In the meantime, just be careful and avoid running a daemon as root.

## License (MIT)

> **Copyright © 2016 Manaflair**
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
