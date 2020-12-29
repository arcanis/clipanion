---
id: options
title: Option Types
---

Clipanion supports many different types of options. In most cases both short-style and long-style options are supported, although they each have their own characteristics that slightly affect when they can be used.

## Arrays

Arrays are just string options that support being repeated multiple times. Just like string options, they also support tuples, so you can declare them such as the following becomes possible:

```
--point x1 y1 --point x2 y2
    => Command {"point": [["x1", "y1"], ["x2", "y2"]]}
```

## Batches

Batches are a set of short-style boolean options put together:

```
-pie
    => Command {"p": true, "i": true, "e": true}
```

## Booleans

Booleans are the most classic type of option; they are mapped to regular booleans based on their sole presence.

```
--foo
    => Command {"point": true}
--no-foo
    => Command {"point": false}
```

## Counters

Counters are boolean options that keep track of how many times they have been enabled. Passing a `--no-` prefix will reset the counter.

```
-vvvv
    => Command {"v": 4}
-vvvv --no-verbose
    => Command {"v": 0}
```

## Positionals

Positional options don't require any particular tagging, but relying on a strict ordering. They can be made required or not. To accept an arbitrary number of positional arguments, see [Rests](#rests).

## Proxies

Proxies are kinda like rests in that they accept an arbitrary number of positional arguments. The difference is that when encountered, proxies stop any further parsing of the command line. You typically only need proxies if your command is acting as a proxy to another command.

In the following example, the proxy kicks off once `yarn run foo` has finished being parsed. Without it, a syntax error would be emitted because neither `--hello` nor `--world` are valid options for `yarn run`:

```
yarn run foo --hello --world
    => Command {"proxy": ["--hello", "--world"]}
```

## Rests

Rests are positional arguments taken to the extreme, as they by default accept an arbitrary amount of data. In the following example everything that follows `yarn add` is aggregated into the rest option:

```
yarn add webpack webpack-cli
    => Command {"rest": ["webpack", "webpack-cli"]}
```

Unlike most other CLI frameworks, Clipanion supports positional arguments on either side of the rest option, meaning that you can implement the `cp` command by adding a required positional argument after the rest option:

```
cp src1 src2 src3 dest/
    => Command {"srcs": ["src1", "src2", "src3"], "dest": "dest/"}
```

## Strings

String options accept an arbitrary argument.

```
--path /path/to/foo
    => Command {"path": "/path/to/foo"}
--path=/path/to/foo
    => Command {"path": "/path/to/foo"}
```

By default this argument is mandatory, but it can be made optional by using the `tolerateBoolean` flag. If this flag is set, then the `=` separator is mandatory when passing an argument (since otherwise it'd be ambiguous whether the parameter is intended as an argument or a positional option).

```
--inspect
    => Command {"inspect": true}
--inspect=9009
    => Command {"inspect": "9009"}
```

Note that Clipanion won't automatically try to deduce the variable types - for instance, in the example above, `--inspect=9009` yields `"9009"` (a string), and not `9009` (a number). To explicitly coerce values, check the page about [validators](validation.md).
