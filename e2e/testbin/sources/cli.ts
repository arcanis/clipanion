#!/usr/bin/env node

import {Cli, Builtins} from 'clipanion';

import {FooCommand}    from './commands/FooCommand';

const cli = new Cli({
  binaryLabel: `Test Bin`,
  binaryName: `testbin`,
  binaryVersion: require(`testbin/package.json`).version,
});

cli.register(FooCommand);

cli.register(Builtins.DefinitionsCommand);
cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

cli.register(Builtins.CompletionCommands);

cli.runExit(process.argv.slice(2), Cli.defaultContext);
