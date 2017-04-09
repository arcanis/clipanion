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
    .run(process.argv0, process.argv.slice(2));
```

## Patterns

Concierge automatically deduces command definitions from what we call patterns. A pattern syntax is as follow:

```
command-name <required-arg-1> <required-arg-2> [optional-arg-1] [... spread-name] [-s,--long-name ARGNAME]
```

Note that `command-name` is allowed to have multiple words, in which case the selected command will always be the command with the largest path that match your command line arguments.

## Environments

Once all the command line arguments have been parsed, an environment object is generated, validated, and passed in the final command action callback. This environment is an object with the following properties:

  - Each key is a parameter name (whether it's a required or optional argument, or an option)
  - Each value is the value associated to the parameter
  - If an option has both a short name and a long name, only the long name will be registered

The environment values have the following properties, excluding any extra validator you may have set:

  - Required arguments are always of type string
  - Optional arguments are always either strings or undefined
  - Short options without arguments are always either true or undefined
  - Short options with arguments are always either a string or undefined
  - Long options without arguments are always either true, false, or undefined
  - Long options with arguments are always either a string, null, or undefined
  - Combinations of short and long options can be of any type at least one of them accepts

## Default command

There's two ways to define a default command. The first one is to just omit the command path:

```js
import { concierge } from '@manaflair/concierge';

concierge
    .command(`[-p,--port PORT]`)
    .action(() => { /* ... */ });
```

Another is to manually add the `DEFAULT_COMMAND` flag to your command:

```js
import { concierge, flags } from '@manaflair/concierge';

concierge
    .command(`install [--production]`)
    .describe(`Install all packages located into your package.json`)
    .flag(flags.DEFAULT_COMMAND)
    .action(() => { /* ... */ });
```

## Validation

Concierge uses the [Joi](https://github.com/hapijs/joi) library to validate its data. You can easily plug your own validators:

```js
import { concierge } from '@manaflair/concierge';

concierge
    .command(`server [-p,--port PORT]`)
    .describe(`Run a server on the specified port`)
    .validate(`port`, Joi => Joi.number().min(1).max(65535).default(8080))
    .action(() => { /* ... */ });

concierge
    .run(process.argv0, process.argv.slice(2));
```

Note that Joi will automatically coherce any value to its expected type if possible, so it is advised that you use it when your options expect arguments (so that you don't end up working with strings or booleans instead of numbers, for example).

## License (MIT)

> **Copyright © 2016 Manaflair**
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
