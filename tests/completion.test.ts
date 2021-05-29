import chaiAsPromised                 from 'chai-as-promised';
import chaiSpies                      from 'chai-spies';
import chai, {expect}                 from 'chai';

import {CompletionFunction}           from '../sources/advanced/options';
import {BaseContext, Command, Option} from '../sources/advanced';
import {identity}                     from '../sources/core';

import {completeCli}                  from './utils';

chai.use(chaiAsPromised);
chai.use(chaiSpies);

describe(`Completion`, () => {
  describe(`Argument types`, () => {
    describe(`Path segments`, () => {
      it(`should complete command paths`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            async execute() {}
          }

          class BarCommand extends Command {
            static paths = [
              [`bar`],
            ];

            async execute() {}
          }

          return [
            FooCommand,
            BarCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: ``,
          prefix: ``,
        })).to.deep.equal([`foo`, `bar`]);
      });

      it(`should complete nested command paths`, async () => {
        const cli = () => {
          class AddCommand extends Command {
            static paths = [
              [`add`],
            ];

            async execute() {}
          }

          class ConfigCommand extends Command {
            static paths = [
              [`config`],
            ];

            async execute() {}
          }

          class ConfigGetCommand extends Command {
            static paths = [
              [`config`, `get`],
            ];

            async execute() {}
          }

          class ConfigSetCommand extends Command {
            static paths = [
              [`config`, `set`],
            ];

            async execute() {}
          }

          class PluginCommand extends Command {
            static paths = [
              [`plugin`],
            ];

            async execute() {}
          }

          class PluginImportCommand extends Command {
            static paths = [
              [`plugin`, `import`],
            ];

            async execute() {}
          }

          class PluginImportFromSourcesCommand extends Command {
            static paths = [
              [`plugin`, `import`, `from`, `sources`],
            ];

            async execute() {}
          }

          class PluginRuntimeCommand extends Command {
            static paths = [
              [`plugin`, `runtime`],
            ];

            async execute() {}
          }

          return [
            AddCommand,
            ConfigCommand,
            ConfigGetCommand,
            ConfigSetCommand,
            PluginCommand,
            PluginImportCommand,
            PluginImportFromSourcesCommand,
            PluginRuntimeCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: ``,
          prefix: ``,
        })).to.deep.equal([`add`, `config`, `plugin`]);

        expect(await completeCli(cli, {
          current: `config `,
          prefix: `config `,
        })).to.deep.equal([`get`, `set`]);

        expect(await completeCli(cli, {
          current: `plugin `,
          prefix: `plugin `,
        })).to.deep.equal([`import`, `runtime`]);

        expect(await completeCli(cli, {
          current: `plugin import `,
          prefix: `plugin import `,
        })).to.deep.equal([`from`]);

        expect(await completeCli(cli, {
          current: `plugin import from `,
          prefix: `plugin import from `,
        })).to.deep.equal([`sources`]);
      });

      it(`shouldn't spend time filtering out completions that don't match as that's the job of the shell scripts`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            async execute() {}
          }

          class BarCommand extends Command {
            static paths = [
              [`bar`],
            ];

            async execute() {}
          }

          class BazCommand extends Command {
            static paths = [
              [`baz`],
            ];

            async execute() {}
          }

          return [
            FooCommand,
            BarCommand,
            BazCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `b`,
          prefix: `b`,
        })).to.deep.equal([`foo`, `bar`, `baz`]);
      });
    });

    describe(`Positionals`, () => {
      it(`should complete leading positionals`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            leading = Option.String({completion: () => [`a`, `b`, `c`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `foo `,
          prefix: `foo `,
        })).to.deep.equal([`a`, `b`, `c`]);

        expect(await completeCli(cli, {
          current: `foo a `,
          prefix: `foo a `,
        })).to.deep.equal([]);
      });

      it(`should complete extra (string) positionals`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            extra = Option.String({required: false, completion: () => [`d`, `e`, `f`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `foo `,
          prefix: `foo `,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo a `,
          prefix: `foo a `,
        })).to.deep.equal([]);
      });

      it(`should complete extra (rest) positionals`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            extra = Option.Rest({completion: () => [`d`, `e`, `f`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `foo `,
          prefix: `foo `,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo a `,
          prefix: `foo a `,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo a b`,
          prefix: `foo a b`,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo a c`,
          prefix: `foo a c`,
        })).to.deep.equal([`d`, `e`, `f`]);
      });

      it(`should complete extra (proxy) positionals`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            extra = Option.Proxy({completion: () => [`d`, `e`, `f`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `foo `,
          prefix: `foo `,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo a `,
          prefix: `foo a `,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo a b`,
          prefix: `foo a b`,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo a c`,
          prefix: `foo a c`,
        })).to.deep.equal([`d`, `e`, `f`]);
      });

      it(`should complete leading positionals + extra (string) positionals`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            leading = Option.String({completion: () => [`a`, `b`, `c`]});

            extra = Option.String({required: false, completion: () => [`d`, `e`, `f`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `foo `,
          prefix: `foo `,
        })).to.deep.equal([`a`, `b`, `c`]);

        expect(await completeCli(cli, {
          current: `foo a `,
          prefix: `foo a `,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo a e `,
          prefix: `foo a e `,
        })).to.deep.equal([]);
      });

      it(`should complete leading positionals + extra (rest) positionals`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            leading = Option.String({completion: () => [`a`, `b`, `c`]});

            extra = Option.Rest({completion: () => [`d`, `e`, `f`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `foo `,
          prefix: `foo `,
        })).to.deep.equal([`a`, `b`, `c`]);

        expect(await completeCli(cli, {
          current: `foo a `,
          prefix: `foo a `,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo a b`,
          prefix: `foo a b`,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo a c`,
          prefix: `foo a c`,
        })).to.deep.equal([`d`, `e`, `f`]);
      });

      it(`should complete leading positionals + extra (proxy) positionals`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            leading = Option.String({completion: () => [`a`, `b`, `c`]});

            extra = Option.Proxy({completion: () => [`d`, `e`, `f`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `foo `,
          prefix: `foo `,
        })).to.deep.equal([`a`, `b`, `c`]);

        expect(await completeCli(cli, {
          current: `foo a `,
          prefix: `foo a `,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo a b`,
          prefix: `foo a b`,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo a c`,
          prefix: `foo a c`,
        })).to.deep.equal([`d`, `e`, `f`]);
      });

      it(`should complete leading positionals + extra (string) positionals + trailing positionals`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            leading = Option.String({completion: () => [`a`, `b`, `c`]});

            extra = Option.String({required: false, completion: () => [`d`, `e`, `f`]});

            trailing = Option.String({completion: () => [`g`, `h`, `i`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `foo `,
          prefix: `foo `,
        })).to.deep.equal([`a`, `b`, `c`]);

        expect(await completeCli(cli, {
          current: `foo a `,
          prefix: `foo a `,
        })).to.deep.equal([`d`, `e`, `f`, `g`, `h`, `i`]);

        expect(await completeCli(cli, {
          current: `foo a e `,
          prefix: `foo a e `,
        })).to.deep.equal([`g`, `h`, `i`]);
      });

      it(`should complete leading positionals + extra (rest) positionals + trailing positionals`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            leading = Option.String({completion: () => [`a`, `b`, `c`]});

            extra = Option.Rest({completion: () => [`d`, `e`, `f`]});

            trailing = Option.String({completion: () => [`g`, `h`, `i`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `foo `,
          prefix: `foo `,
        })).to.deep.equal([`a`, `b`, `c`]);

        expect(await completeCli(cli, {
          current: `foo a `,
          prefix: `foo a `,
        })).to.deep.equal([`d`, `e`, `f`, `g`, `h`, `i`]);

        expect(await completeCli(cli, {
          current: `foo a b`,
          prefix: `foo a b`,
        })).to.deep.equal([`d`, `e`, `f`, `g`, `h`, `i`]);

        expect(await completeCli(cli, {
          current: `foo a c`,
          prefix: `foo a c`,
        })).to.deep.equal([`d`, `e`, `f`, `g`, `h`, `i`]);
      });

      it(`should complete leading positionals + extra (proxy) positionals + trailing positionals`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            leading = Option.String({completion: () => [`a`, `b`, `c`]});

            extra = Option.Proxy({completion: () => [`d`, `e`, `f`]});

            trailing = Option.String({completion: () => [`g`, `h`, `i`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `foo `,
          prefix: `foo `,
        })).to.deep.equal([`a`, `b`, `c`]);

        expect(await completeCli(cli, {
          current: `foo a `,
          prefix: `foo a `,
        })).to.deep.equal([`d`, `e`, `f`, `g`, `h`, `i`]);

        expect(await completeCli(cli, {
          current: `foo a b`,
          prefix: `foo a b`,
        })).to.deep.equal([`d`, `e`, `f`, `g`, `h`, `i`]);

        expect(await completeCli(cli, {
          current: `foo a c`,
          prefix: `foo a c`,
        })).to.deep.equal([`d`, `e`, `f`, `g`, `h`, `i`]);
      });
    });

    describe(`Options`, () => {
      it(`should complete long option names`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            foo = Option.Boolean(`-f,--foo`);

            bar = Option.String(`-b,--bar`, {completion: () => [`a`, `b`, `c`]});

            baz = Option.String(`-B,--baz`, {arity: 3})

            qux = Option.String(`-q,--qux`, {tolerateBoolean: true, completion: () => [`d`, `e`, `f`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        const options = [
          {completionText: `--foo`, listItemText: `-f,--foo`, description: undefined},
          {completionText: `--bar`, listItemText: `-b,--bar`, description: undefined},
          {completionText: `--baz`, listItemText: `-B,--baz`, description: undefined},
          {completionText: `--qux`, listItemText: `-q,--qux`, description: undefined},
        ];

        expect(await completeCli(cli, {
          current: `foo -`,
          prefix: `foo -`,
        })).to.deep.equal(options);

        expect(await completeCli(cli, {
          current: `foo --`,
          prefix: `foo --`,
        })).to.deep.equal(options);

        expect(await completeCli(cli, {
          current: `foo --f`,
          prefix: `foo --f`,
        })).to.deep.equal(options);

        expect(await completeCli(cli, {
          current: `foo --fo`,
          prefix: `foo --fo`,
        })).to.deep.equal(options);

        expect(await completeCli(cli, {
          current: `foo --foo`,
          prefix: `foo -`,
        })).to.deep.equal(options);

        expect(await completeCli(cli, {
          current: `foo --foo`,
          prefix: `foo --`,
        })).to.deep.equal(options);

        expect(await completeCli(cli, {
          current: `foo --foo`,
          prefix: `foo --f`,
        })).to.deep.equal(options);

        expect(await completeCli(cli, {
          current: `foo --foo`,
          prefix: `foo --fo`,
        })).to.deep.equal(options);

        expect(await completeCli(cli, {
          current: `foo --foo`,
          prefix: `foo --foo`,
        })).to.deep.equal(options);

        expect(await completeCli(cli, {
          current: `foo --bar`,
          prefix: `foo --bar`,
        })).to.deep.equal(options);

        expect(await completeCli(cli, {
          current: `foo --baz`,
          prefix: `foo --baz`,
        })).to.deep.equal(options);

        expect(await completeCli(cli, {
          current: `foo --qux`,
          prefix: `foo --qux`,
        })).to.deep.equal(options);
      });

      it(`should complete negated long option names`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            foo = Option.Boolean(`-f,--foo`);

            bar = Option.String(`-b,--bar`, {completion: () => [`a`, `b`, `c`]});

            baz = Option.String(`-B,--baz`, {arity: 3})

            qux = Option.String(`-q,--qux`, {tolerateBoolean: true, completion: () => [`d`, `e`, `f`]});

            nonInteractive = Option.Boolean(`--non-interactive`);

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        const originalOptions = [
          {completionText: `--foo`, listItemText: `-f,--foo`, description: undefined},
          {completionText: `--bar`, listItemText: `-b,--bar`, description: undefined},
          {completionText: `--baz`, listItemText: `-B,--baz`, description: undefined},
          {completionText: `--qux`, listItemText: `-q,--qux`, description: undefined},
          {completionText: `--non-interactive`, listItemText: `--non-interactive`, description: undefined},
        ];

        const originalAndNegatedOptions = [
          {completionText: `--foo`, listItemText: `-f,--foo`, description: undefined},
          {completionText: `--no-foo`, listItemText: `--no-foo`, description: undefined},
          {completionText: `--bar`, listItemText: `-b,--bar`, description: undefined},
          {completionText: `--baz`, listItemText: `-B,--baz`, description: undefined},
          {completionText: `--qux`, listItemText: `-q,--qux`, description: undefined},
          {completionText: `--no-qux`, listItemText: `--no-qux`, description: undefined},
          {completionText: `--non-interactive`, listItemText: `--non-interactive`, description: undefined},
          {completionText: `--no-non-interactive`, listItemText: `--no-non-interactive`, description: undefined},
        ];

        expect(await completeCli(cli, {
          current: `foo -`,
          prefix: `foo -`,
        })).to.deep.equal(originalOptions);

        expect(await completeCli(cli, {
          current: `foo --`,
          prefix: `foo --`,
        })).to.deep.equal(originalOptions);

        expect(await completeCli(cli, {
          current: `foo --foo`,
          prefix: `foo -`,
        })).to.deep.equal(originalOptions);

        expect(await completeCli(cli, {
          current: `foo --foo`,
          prefix: `foo --`,
        })).to.deep.equal(originalOptions);

        expect(await completeCli(cli, {
          current: `foo --n`,
          prefix: `foo --n`,
        })).to.deep.equal(originalOptions);

        expect(await completeCli(cli, {
          current: `foo --no`,
          prefix: `foo --no`,
        })).to.deep.equal(originalOptions);

        expect(await completeCli(cli, {
          current: `foo --no-`,
          prefix: `foo --no`,
        })).to.deep.equal(originalOptions);

        expect(await completeCli(cli, {
          current: `foo --no-`,
          prefix: `foo --no-`,
        })).to.deep.equal(originalAndNegatedOptions);

        expect(await completeCli(cli, {
          current: `foo --no-f`,
          prefix: `foo --no-f`,
        })).to.deep.equal(originalAndNegatedOptions);

        expect(await completeCli(cli, {
          current: `foo --no-fo`,
          prefix: `foo --no-fo`,
        })).to.deep.equal(originalAndNegatedOptions);

        expect(await completeCli(cli, {
          current: `foo --no-foo`,
          prefix: `foo --no-foo`,
        })).to.deep.equal(originalAndNegatedOptions);

        expect(await completeCli(cli, {
          current: `foo --non`,
          prefix: `foo --non`,
        })).to.deep.equal(originalOptions);
      });

      it(`should complete option names of options that allow binding when "current" is a binding and "prefix" is not`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            foo = Option.Boolean(`-f,--foo`);

            bar = Option.String(`-b,--bar`, {completion: () => [`a`, `b`, `c`]});

            qux = Option.String(`-q,--qux`, {tolerateBoolean: true, completion: () => [`d`, `e`, `f`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        const boundNames = [{
          completionText: `--bar=`,
          listItemText: `-b,--bar`,
          description: undefined,
        }, {
          completionText: `--qux=`,
          listItemText: `-q,--qux`,
          description: undefined,
        }];

        const boundNamesWithValue = [{
          completionText: `--bar=test`,
          listItemText: `-b,--bar`,
          description: undefined,
        }, {
          completionText: `--qux=test`,
          listItemText: `-q,--qux`,
          description: undefined,
        }];

        expect(await completeCli(cli, {
          current: `foo --bar=`,
          prefix: `foo -`,
        })).to.deep.equal(boundNames);

        expect(await completeCli(cli, {
          current: `foo --ba=`,
          prefix: `foo -`,
        })).to.deep.equal(boundNames);

        expect(await completeCli(cli, {
          current: `foo --bar=`,
          prefix: `foo --`,
        })).to.deep.equal(boundNames);

        expect(await completeCli(cli, {
          current: `foo --ba=`,
          prefix: `foo --`,
        })).to.deep.equal(boundNames);

        expect(await completeCli(cli, {
          current: `foo --bar=`,
          prefix: `foo --b`,
        })).to.deep.equal(boundNames);

        expect(await completeCli(cli, {
          current: `foo --ba=`,
          prefix: `foo --b`,
        })).to.deep.equal(boundNames);

        expect(await completeCli(cli, {
          current: `foo --bar=`,
          prefix: `foo --ba`,
        })).to.deep.equal(boundNames);

        expect(await completeCli(cli, {
          current: `foo --ba=`,
          prefix: `foo --ba`,
        })).to.deep.equal(boundNames);

        expect(await completeCli(cli, {
          current: `foo --bar=`,
          prefix: `foo --bar`,
        })).to.deep.equal(boundNames);


        expect(await completeCli(cli, {
          current: `foo --qux=test`,
          prefix: `foo -`,
        })).to.deep.equal(boundNamesWithValue);

        expect(await completeCli(cli, {
          current: `foo --qu=test`,
          prefix: `foo -`,
        })).to.deep.equal(boundNamesWithValue);

        expect(await completeCli(cli, {
          current: `foo --qux=test`,
          prefix: `foo --`,
        })).to.deep.equal(boundNamesWithValue);

        expect(await completeCli(cli, {
          current: `foo --qu=test`,
          prefix: `foo --`,
        })).to.deep.equal(boundNamesWithValue);

        expect(await completeCli(cli, {
          current: `foo --qux=test`,
          prefix: `foo --q`,
        })).to.deep.equal(boundNamesWithValue);

        expect(await completeCli(cli, {
          current: `foo --qu=test`,
          prefix: `foo --q`,
        })).to.deep.equal(boundNamesWithValue);

        expect(await completeCli(cli, {
          current: `foo --qux=test`,
          prefix: `foo --qu`,
        })).to.deep.equal(boundNamesWithValue);

        expect(await completeCli(cli, {
          current: `foo --qu=test`,
          prefix: `foo --qu`,
        })).to.deep.equal(boundNamesWithValue);

        expect(await completeCli(cli, {
          current: `foo --qux=test`,
          prefix: `foo --qux`,
        })).to.deep.equal(boundNamesWithValue);
      });

      it(`should complete batch option names`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            foo = Option.Boolean(`-f,--foo`);

            bar = Option.String(`-b,--bar`, {completion: () => [`a`, `b`, `c`]});

            baz = Option.Boolean(`-B,--baz`);

            qux = Option.String(`-q,--qux`, {tolerateBoolean: true, completion: () => [`d`, `e`, `f`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `foo -f`,
          prefix: `foo -f`,
        })).to.deep.equal([
          {completionText: `-f`, listItemText: `-f,--foo`, description: undefined},
          {completionText: `-fB`, listItemText: `-B,--baz`, description: undefined},
          {completionText: `-fq`, listItemText: `-q,--qux`, description: undefined},
        ]);

        expect(await completeCli(cli, {
          current: `foo -fB`,
          prefix: `foo -fB`,
        })).to.deep.equal([
          {completionText: `-fB`, listItemText: `-B,--baz`, description: undefined},
          {completionText: `-fBq`, listItemText: `-q,--qux`, description: undefined},
        ]);

        expect(await completeCli(cli, {
          current: `foo -fBq`,
          prefix: `foo -fBq`,
        })).to.deep.equal([
          {completionText: `-fBq`, listItemText: `-q,--qux`, description: undefined},
        ]);

        expect(await completeCli(cli, {
          current: `foo -q`,
          prefix: `foo -q`,
        })).to.deep.equal([
          {completionText: `-q`, listItemText: `-q,--qux`, description: undefined},
          {completionText: `-qf`, listItemText: `-f,--foo`, description: undefined},
          {completionText: `-qB`, listItemText: `-B,--baz`, description: undefined},
        ]);

        expect(await completeCli(cli, {
          current: `foo -qf`,
          prefix: `foo -qf`,
        })).to.deep.equal([
          {completionText: `-qf`, listItemText: `-f,--foo`, description: undefined},
          {completionText: `-qfB`, listItemText: `-B,--baz`, description: undefined},
        ]);

        expect(await completeCli(cli, {
          current: `foo -qfB`,
          prefix: `foo -qfB`,
        })).to.deep.equal([
          {completionText: `-qfB`, listItemText: `-B,--baz`, description: undefined},
        ]);

        expect(await completeCli(cli, {
          current: `foo -fB`,
          prefix: `foo -`,
        })).to.deep.equal([
          {completionText: `-qfB`, listItemText: `-q,--qux`, description: undefined},
        ]);

        expect(await completeCli(cli, {
          current: `foo -fB`,
          prefix: `foo -f`,
        })).to.deep.equal([
          {completionText: `-fB`, listItemText: `-f,--foo`, description: undefined},
          {completionText: `-fqB`, listItemText: `-q,--qux`, description: undefined},
        ]);
      });

      it(`should complete string option values`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            bar = Option.String(`-b,--bar`, {completion: () => [`a`, `b`, `c`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        for (const name of [`-b`, `--bar`]) {
          expect(await completeCli(cli, {
            current: `foo ${name} `,
            prefix: `foo ${name} `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name}=`,
            prefix: `foo ${name}=`,
          })).to.deep.equal([`${name}=a`, `${name}=b`, `${name}=c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a `,
            prefix: `foo ${name} a `,
          })).to.deep.equal([]);

          expect(await completeCli(cli, {
            current: `foo ${name} a ${name} `,
            prefix: `foo ${name} a ${name} `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name}=a ${name}=`,
            prefix: `foo ${name}=a ${name}=`,
          })).to.deep.equal([`${name}=a`, `${name}=b`, `${name}=c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a ${name} b `,
            prefix: `foo ${name} a ${name} b `,
          })).to.deep.equal([]);
        }
      });

      it(`should complete string option values (tolerateBoolean)`, async () => {
        const richCompletions = (rawCompletions: Array<string>) => rawCompletions.map(text => ({
          completionText: text,
          listItemText: `should remain unchanged`,
          description: `should remain unchanged`,
        }));

        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            bar = Option.String(`-b,--bar`, {tolerateBoolean: true, completion: () => [`a`, `b`, `c`]});

            barRich = Option.String(`--bar-rich`, {tolerateBoolean: true, completion: () => richCompletions([`a`, `b`, `c`])});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        for (const name of [`-b`, `--bar`]) {
          expect(await completeCli(cli, {
            current: `foo ${name} `,
            prefix: `foo ${name} `,
          })).to.deep.equal([]);

          expect(await completeCli(cli, {
            current: `foo ${name}=`,
            prefix: `foo ${name}=`,
          })).to.deep.equal([`${name}=a`, `${name}=b`, `${name}=c`]);

          expect(await completeCli(cli, {
            current: `foo ${name}=a `,
            prefix: `foo ${name}=a `,
          })).to.deep.equal([]);

          expect(await completeCli(cli, {
            current: `foo ${name}=a ${name} `,
            prefix: `foo ${name}=a ${name} `,
          })).to.deep.equal([]);

          expect(await completeCli(cli, {
            current: `foo ${name}=a ${name}=`,
            prefix: `foo ${name}=a ${name}=`,
          })).to.deep.equal([`${name}=a`, `${name}=b`, `${name}=c`]);

          expect(await completeCli(cli, {
            current: `foo ${name}=a ${name}=a `,
            prefix: `foo ${name}=a ${name}=a `,
          })).to.deep.equal([]);
        }

        expect(await completeCli(cli, {
          current: `foo --bar-rich `,
          prefix: `foo --bar-rich `,
        })).to.deep.equal([]);

        expect(await completeCli(cli, {
          current: `foo --bar-rich=`,
          prefix: `foo --bar-rich=`,
        })).to.deep.equal(richCompletions([`--bar-rich=a`, `--bar-rich=b`, `--bar-rich=c`]));

        expect(await completeCli(cli, {
          current: `foo --bar-rich=a `,
          prefix: `foo --bar-rich=a `,
        })).to.deep.equal([]);

        expect(await completeCli(cli, {
          current: `foo --bar-rich=a --bar-rich `,
          prefix: `foo --bar-rich=a --bar-rich `,
        })).to.deep.equal([]);

        expect(await completeCli(cli, {
          current: `foo --bar-rich --bar-rich=`,
          prefix: `foo --bar-rich --bar-rich=`,
        })).to.deep.equal(richCompletions([`--bar-rich=a`, `--bar-rich=b`, `--bar-rich=c`]));

        expect(await completeCli(cli, {
          current: `foo --bar-rich --bar-rich=a `,
          prefix: `foo --bar-rich --bar-rich=a `,
        })).to.deep.equal([]);
      });

      it(`should complete string option values (tuples)`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            bar = Option.String(`-b,--bar`, {arity: 3, completion: () => [`a`, `b`, `c`]});
            baz = Option.String(`--baz`, {arity: 3, completion: [() => [`a`, `b`, `c`], () => [`d`, `e`, `f`], () => [`g`, `h`, `i`]]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        for (const name of [`-b`, `--bar`]) {
          expect(await completeCli(cli, {
            current: `foo ${name} `,
            prefix: `foo ${name} `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a `,
            prefix: `foo ${name} a `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a b `,
            prefix: `foo ${name} a b `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a b c `,
            prefix: `foo ${name} a b c `,
          })).to.deep.equal([]);

          expect(await completeCli(cli, {
            current: `foo ${name} a b c ${name} `,
            prefix: `foo ${name} a b c ${name} `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a b c ${name} d `,
            prefix: `foo ${name} a b c ${name} d `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a b c ${name} d e `,
            prefix: `foo ${name} a b c ${name} d e `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a b c ${name} d e f `,
            prefix: `foo ${name} a b c ${name} d e f `,
          })).to.deep.equal([]);
        }


        expect(await completeCli(cli, {
          current: `foo --baz `,
          prefix: `foo --baz `,
        })).to.deep.equal([`a`, `b`, `c`]);

        expect(await completeCli(cli, {
          current: `foo --baz a `,
          prefix: `foo --baz a `,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo --baz a b `,
          prefix: `foo --baz a b `,
        })).to.deep.equal([`g`, `h`, `i`]);

        expect(await completeCli(cli, {
          current: `foo --baz a b c `,
          prefix: `foo --baz a b c `,
        })).to.deep.equal([]);

        expect(await completeCli(cli, {
          current: `foo --baz a b c --baz `,
          prefix: `foo --baz a b c --baz `,
        })).to.deep.equal([`a`, `b`, `c`]);

        expect(await completeCli(cli, {
          current: `foo --baz a b c --baz d `,
          prefix: `foo --baz a b c --baz d `,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo --baz a b c --baz d e `,
          prefix: `foo --baz a b c --baz d e `,
        })).to.deep.equal([`g`, `h`, `i`]);

        expect(await completeCli(cli, {
          current: `foo --baz a b c --baz d e f `,
          prefix: `foo --baz a b c --baz d e f `,
        })).to.deep.equal([]);
      });

      it(`should complete array option values`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            bar = Option.Array(`-b,--bar`, {completion: () => [`a`, `b`, `c`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        for (const name of [`-b`, `--bar`]) {
          expect(await completeCli(cli, {
            current: `foo ${name} `,
            prefix: `foo ${name} `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name}=`,
            prefix: `foo ${name}=`,
          })).to.deep.equal([`${name}=a`, `${name}=b`, `${name}=c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a `,
            prefix: `foo ${name} a `,
          })).to.deep.equal([]);

          expect(await completeCli(cli, {
            current: `foo ${name} a ${name} `,
            prefix: `foo ${name} a ${name} `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name}=a ${name}=`,
            prefix: `foo ${name}=a ${name}=`,
          })).to.deep.equal([`${name}=a`, `${name}=b`, `${name}=c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a ${name} b `,
            prefix: `foo ${name} a ${name} b `,
          })).to.deep.equal([]);
        }
      });

      it(`should complete array option values (tuples)`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            bar = Option.Array(`-b,--bar`, {arity: 3, completion: () => [`a`, `b`, `c`]});
            baz = Option.Array(`--baz`, {arity: 3, completion: [() => [`a`, `b`, `c`], () => [`d`, `e`, `f`], () => [`g`, `h`, `i`]]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        for (const name of [`-b`, `--bar`]) {
          expect(await completeCli(cli, {
            current: `foo ${name} `,
            prefix: `foo ${name} `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a `,
            prefix: `foo ${name} a `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a b `,
            prefix: `foo ${name} a b `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a b c `,
            prefix: `foo ${name} a b c `,
          })).to.deep.equal([]);

          expect(await completeCli(cli, {
            current: `foo ${name} a b c ${name} `,
            prefix: `foo ${name} a b c ${name} `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a b c ${name} d `,
            prefix: `foo ${name} a b c ${name} d `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a b c ${name} d e `,
            prefix: `foo ${name} a b c ${name} d e `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a b c ${name} d e f `,
            prefix: `foo ${name} a b c ${name} d e f `,
          })).to.deep.equal([]);
        }


        expect(await completeCli(cli, {
          current: `foo --baz `,
          prefix: `foo --baz `,
        })).to.deep.equal([`a`, `b`, `c`]);

        expect(await completeCli(cli, {
          current: `foo --baz a `,
          prefix: `foo --baz a `,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo --baz a b `,
          prefix: `foo --baz a b `,
        })).to.deep.equal([`g`, `h`, `i`]);

        expect(await completeCli(cli, {
          current: `foo --baz a b c `,
          prefix: `foo --baz a b c `,
        })).to.deep.equal([]);

        expect(await completeCli(cli, {
          current: `foo --baz a b c --baz `,
          prefix: `foo --baz a b c --baz `,
        })).to.deep.equal([`a`, `b`, `c`]);

        expect(await completeCli(cli, {
          current: `foo --baz a b c --baz d `,
          prefix: `foo --baz a b c --baz d `,
        })).to.deep.equal([`d`, `e`, `f`]);

        expect(await completeCli(cli, {
          current: `foo --baz a b c --baz d e `,
          prefix: `foo --baz a b c --baz d e `,
        })).to.deep.equal([`g`, `h`, `i`]);

        expect(await completeCli(cli, {
          current: `foo --baz a b c --baz d e f `,
          prefix: `foo --baz a b c --baz d e f `,
        })).to.deep.equal([]);
      });

      it(`should complete required string option values`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            bar = Option.String(`-b,--bar`, {required: true, completion: () => [`a`, `b`, `c`]});

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        for (const name of [`-b`, `--bar`]) {
          expect(await completeCli(cli, {
            current: `foo ${name} `,
            prefix: `foo ${name} `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name}=`,
            prefix: `foo ${name}=`,
          })).to.deep.equal([`${name}=a`, `${name}=b`, `${name}=c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a `,
            prefix: `foo ${name} a `,
          })).to.deep.equal([]);

          expect(await completeCli(cli, {
            current: `foo ${name} a ${name} `,
            prefix: `foo ${name} a ${name} `,
          })).to.deep.equal([`a`, `b`, `c`]);

          expect(await completeCli(cli, {
            current: `foo ${name}=a ${name}=`,
            prefix: `foo ${name}=a ${name}=`,
          })).to.deep.equal([`${name}=a`, `${name}=b`, `${name}=c`]);

          expect(await completeCli(cli, {
            current: `foo ${name} a ${name} b `,
            prefix: `foo ${name} a ${name} b `,
          })).to.deep.equal([]);
        }
      });
    });

    describe(`Help`, () => {
      it(`should complete help indexes`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            async execute() {}
          }

          class FooCommandWithPositional extends Command {
            static paths = [
              [`foo`],
            ];

            positional = Option.String();

            async execute() {}
          }

          class BarCommand extends Command {
            static paths = [
              [`bar`],
            ];

            option = Option.String(`--opt`);

            async execute() {}
          }

          return [
            FooCommand,
            FooCommandWithPositional,
            BarCommand,
          ];
        };

        const fooHelpCompletions = [
          {completionText: `-h=0`, listItemText: `0`, description: `\u001b[1m$ \u001b[22m... foo\n`},
          {completionText: `--help=0`, listItemText: `0`, description: `\u001b[1m$ \u001b[22m... foo\n`},
          {completionText: `-h=1`, listItemText: `1`, description: `\u001b[1m$ \u001b[22m... foo <positional>\n`},
          {completionText: `--help=1`, listItemText: `1`, description: `\u001b[1m$ \u001b[22m... foo <positional>\n`},
        ];

        const barHelpCompletions = [
          {completionText: `-h=0`, listItemText: `0`, description: `\u001b[1m$ \u001b[22m... bar [--opt #0]\n`},
          {completionText: `--help=0`, listItemText: `0`, description: `\u001b[1m$ \u001b[22m... bar [--opt #0]\n`},
        ];

        for (const name of [`-h`, `--help`]) {
          expect(await completeCli(cli, {
            current: `foo ${name} `,
            prefix: `foo ${name} `,
          })).to.deep.equal([]);

          expect(await completeCli(cli, {
            current: `foo ${name}=`,
            prefix: `foo ${name}=`,
          })).to.deep.equal(fooHelpCompletions);

          expect(await completeCli(cli, {
            current: `bar ${name} `,
            prefix: `bar ${name} `,
          })).to.deep.equal([]);

          expect(await completeCli(cli, {
            current: `bar ${name}=`,
            prefix: `bar ${name}=`,
          })).to.deep.equal(barHelpCompletions);

          expect(await completeCli(cli, {
            current: `bar --opt val ${name}=`,
            prefix: `bar --opt val ${name}=`,
          })).to.deep.equal(barHelpCompletions);

          expect(await completeCli(cli, {
            current: `bar --opt=val ${name}=`,
            prefix: `bar --opt=val ${name}=`,
          })).to.deep.equal(barHelpCompletions);
        }
      });
    });
  });

  describe(`API`, () => {
    describe(`Cli.prototype.complete`, () => {
      it(`should accept partial requests`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `fo`,
          prefix: `f`,
        })).to.deep.equal([`foo`]);

        expect(await completeCli(cli, {
          current: `fo`,
          suffix: `o`,
        })).to.deep.equal([`foo`]);

        expect(await completeCli(cli, {
          prefix: `f`,
          suffix: `o`,
        })).to.deep.equal([`foo`]);

        expect(await completeCli(cli, {
          current: `fo`,
          prefix: `f`,
          suffix: `o`,
        })).to.deep.equal([`foo`]);
      });

      it(`should reject requests with a single property`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        // @ts-expect-error
        await expect(completeCli(cli, {
          current: `fo`,
        })).to.be.rejectedWith(`Invalid completion request`);

        // @ts-expect-error
        await expect(completeCli(cli, {
          prefix: `f`,
        })).to.be.rejectedWith(`Invalid completion request`);

        // @ts-expect-error
        await expect(completeCli(cli, {
          suffix: `o`,
        })).to.be.rejectedWith(`Invalid completion request`);
      });

      it(`should reject requests when the prefix/suffix doesn't match current`, async () => {
        const cli = () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            async execute() {}
          }

          return [
            FooCommand,
          ];
        };

        await expect(completeCli(cli, {
          current: `fo`,
          prefix: `b`,
        })).to.be.rejectedWith(`Invalid completion request`);

        await expect(completeCli(cli, {
          current: `fo`,
          suffix: `a`,
        })).to.be.rejectedWith(`Invalid completion request`);
      });

      it(`should allow forwarding completion requests and overriding the context`, async () => {
        type Context = BaseContext & {
          cwd: string;
        };

        const cli = () => {
          class FooCommand extends Command<Context> {
            static paths = [
              [`foo`],
            ];

            leading = Option.String({
              completion: this.completion((request, command) =>
                command.cli.complete({
                  current: `bar `,
                  prefix: `bar `,
                }, {cwd: `test`})
              ),
            });

            async execute() {}
          }

          class BarCommand extends Command<Context> {
            static paths = [
              [`bar`],
            ];

            leading = Option.String({completion: this.completion((request, command) => [command.context.cwd])});

            async execute() {}
          }

          return [
            FooCommand,
            BarCommand,
          ];
        };

        expect(await completeCli(cli, {
          current: `foo `,
          prefix: `foo `,
        })).to.deep.equal([`test`]);
      });
    });

    describe(`CompletionFunction`, () => {
      it(`shouldn't call the completion function if called with the help flag`, async () => {
        {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            bar = Option.String(`--bar`, {
              completion: spy,
            });

            async execute() {}
          }

          const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
            return [];
          }));

          const cli = () => {
            return [
              FooCommand,
            ];
          };

          await completeCli(cli, {
            current: `foo --help --bar `,
            prefix: `foo --help --bar `,
          });

          await completeCli(cli, {
            current: `foo -h --bar `,
            prefix: `foo -h --bar `,
          });

          expect(spy).not.to.have.been.called;
        }
      });

      describe(`PartialCommand`, () => {
        it(`should populate command.{cli,context}`, async () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            bar = Option.String(`--bar`, {
              completion: spy,
            });

            async execute() {}
          }

          const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
            expect(command.cli).to.be.an(`object`);
            expect(command.context).to.be.an(`object`).with.keys([`stdin`, `stdout`, `stderr`]);

            return [];
          }));

          const cli = () => {
            return [
              FooCommand,
            ];
          };

          await completeCli(cli, {
            current: `foo --bar `,
            prefix: `foo --bar `,
          });

          expect(spy).to.have.been.called.once;
        });

        it(`should populate command.path with the path used to access the command`, async () => {
          {
            class FooCommand extends Command {
              static paths = [
                [`foo`],
                [`bar`],
              ];

              bar = Option.String(`--bar`, {
                completion: spy,
              });

              async execute() {}
            }

            const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
              expect(command.path).to.deep.equal([`foo`]);

              return [];
            }));

            const cli = () => {
              return [
                FooCommand,
              ];
            };

            await completeCli(cli, {
              current: `foo --bar `,
              prefix: `foo --bar `,
            });

            expect(spy).to.have.been.called.once;
          }

          {
            class FooCommand extends Command {
              static paths = [
                [`foo`],
                [`bar`],
              ];

              bar = Option.String(`--bar`, {
                completion: spy,
              });

              async execute() {}
            }

            const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
              expect(command.path).to.deep.equal([`bar`]);

              return [];
            }));

            const cli = () => {
              return [
                FooCommand,
              ];
            };

            await completeCli(cli, {
              current: `bar --bar `,
              prefix: `bar --bar `,
            });

            expect(spy).to.have.been.called.once;
          }
        });

        it(`should set command.help to false`, async () => {
          class FooCommand extends Command {
            static paths = [
              [`foo`],
            ];

            bar = Option.String(`--bar`, {
              completion: spy,
            });

            async execute() {}
          }

          const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
            expect(command.help).to.be.false;

            return [];
          }));

          const cli = () => {
            return [
              FooCommand,
            ];
          };

          await completeCli(cli, {
            current: `foo --bar `,
            prefix: `foo --bar `,
          });

          expect(spy).to.have.been.called.once;
        });
      });

      describe(`CompletionRequest & PartialCommand - should always refer to the single segment that is completed & should populate the corresponding property on the command`, () => {
        describe(`Positionals`, () => {
          it(`leading`, async () => {
            const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
              expect(request).to.deep.equal({
                current: `abcd`,
                prefix: `ab`,
                suffix: `cd`,
              });
              expect(command.leading).to.equal(`abcd`);

              return [];
            }));

            class FooCommand extends Command {
              static paths = [
                [`foo`],
              ];

              leading = Option.String({completion: spy});

              async execute() {}
            }

            const cli = () => {
              return [
                FooCommand,
              ];
            };

            await completeCli(cli, {
              current: `foo abcd`,
              prefix: `foo ab`,
            });

            expect(spy).to.have.been.called.once;
          });

          it(`extra (string)`, async () => {
            const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
              expect(request).to.deep.equal({
                current: `abcd`,
                prefix: `ab`,
                suffix: `cd`,
              });
              expect(command.extra).to.equal(`abcd`);

              return [];
            }));

            class FooCommand extends Command {
              static paths = [
                [`foo`],
              ];

              extra = Option.String({required: false, completion: spy});

              async execute() {}
            }

            const cli = () => {
              return [
                FooCommand,
              ];
            };

            await completeCli(cli, {
              current: `foo abcd`,
              prefix: `foo ab`,
            });

            expect(spy).to.have.been.called.once;
          });

          it(`extra (rest)`, async () => {
            let calls = 0;

            const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
              ++calls;

              expect(request).to.deep.equal({
                current: `abcd`,
                prefix: `ab`,
                suffix: `cd`,
              });
              expect(command.extra).to.deep.equal(new Array(calls).fill(`abcd`));

              return [];
            }));

            class FooCommand extends Command {
              static paths = [
                [`foo`],
              ];

              extra = Option.Rest({completion: spy});

              async execute() {}
            }

            const cli = () => {
              return [
                FooCommand,
              ];
            };

            await completeCli(cli, {
              current: `foo abcd`,
              prefix: `foo ab`,
            });

            await completeCli(cli, {
              current: `foo abcd abcd`,
              prefix: `foo abcd ab`,
            });

            await completeCli(cli, {
              current: `foo abcd abcd abcd`,
              prefix: `foo abcd abcd ab`,
            });

            expect(spy).to.have.been.called.exactly(3);
          });

          it(`extra (proxy)`, async () => {
            let calls = 0;

            const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
              ++calls;
              expect(request).to.deep.equal({
                current: `abcd`,
                prefix: `ab`,
                suffix: `cd`,
              });
              expect(command.extra).to.deep.equal(new Array(calls).fill(`abcd`));

              return [];
            }));

            class FooCommand extends Command {
              static paths = [
                [`foo`],
              ];

              extra = Option.Proxy({completion: spy});

              async execute() {}
            }

            const cli = () => {
              return [
                FooCommand,
              ];
            };

            await completeCli(cli, {
              current: `foo abcd`,
              prefix: `foo ab`,
            });

            await completeCli(cli, {
              current: `foo abcd abcd`,
              prefix: `foo abcd ab`,
            });

            await completeCli(cli, {
              current: `foo abcd abcd abcd`,
              prefix: `foo abcd abcd ab`,
            });

            expect(spy).to.have.been.called.exactly(3);
          });

          it(`trailing`, async () => {
            const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
              expect(request).to.deep.equal({
                current: `abcd`,
                prefix: `ab`,
                suffix: `cd`,
              });
              expect(command.trailing).to.equal(`abcd`);

              return [];
            }));

            class FooCommand extends Command {
              static paths = [
                [`foo`],
              ];

              leading = Option.String();

              extra = Option.String({required: false});

              trailing = Option.String({completion: spy});

              async execute() {}
            }

            const cli = () => {
              return [
                FooCommand,
              ];
            };

            await completeCli(cli, {
              current: `foo 1 abcd`,
              prefix: `foo 1 ab`,
            });

            expect(spy).to.have.been.called.once;
          });
        });

        describe(`Options`, () => {
          it(`string option values`, async () => {
            const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
              expect(request).to.deep.equal({
                current: `abcd`,
                prefix: `ab`,
                suffix: `cd`,
              });
              expect(command.bar).to.equal(`abcd`);

              return [];
            }));

            class FooCommand extends Command {
              static paths = [
                [`foo`],
              ];

              bar = Option.String(`--bar`, {completion: spy});

              async execute() {}
            }

            const cli = () => {
              return [
                FooCommand,
              ];
            };

            await completeCli(cli, {
              current: `foo --bar abcd`,
              prefix: `foo --bar ab`,
            });

            await completeCli(cli, {
              current: `foo --bar=abcd`,
              prefix: `foo --bar=ab`,
            });

            await completeCli(cli, {
              current: `foo --bar abcd --bar abcd`,
              prefix: `foo --bar abcd --bar ab`,
            });


            await completeCli(cli, {
              current: `foo --bar=abcd --bar=abcd`,
              prefix: `foo --bar=abcd --bar=ab`,
            });

            expect(spy).to.have.been.called.exactly(4);
          });

          it(`string option values (tolerateBoolean)`, async () => {
            const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
              expect(request).to.deep.equal({
                current: `abcd`,
                prefix: `ab`,
                suffix: `cd`,
              });
              expect(command.bar).to.equal(`abcd`);

              return [];
            }));

            class FooCommand extends Command {
              static paths = [
                [`foo`],
              ];

              bar = Option.String(`--bar`, {tolerateBoolean: true, completion: spy});

              async execute() {}
            }

            const cli = () => {
              return [
                FooCommand,
              ];
            };

            await completeCli(cli, {
              current: `foo --bar=abcd`,
              prefix: `foo --bar=ab`,
            });

            await completeCli(cli, {
              current: `foo --bar=abcd --bar=abcd`,
              prefix: `foo --bar=abcd --bar=ab`,
            });

            expect(spy).to.have.been.called.twice;
          });

          it(`string option values (tuples)`, async () => {
            let calls = 0;

            const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
              ++calls;

              expect(request).to.deep.equal({
                current: `abcd`,
                prefix: `ab`,
                suffix: `cd`,
              });
              expect(command.bar).to.deep.equal(new Array(calls % 3 || 3).fill(`abcd`));

              return [];
            }));

            class FooCommand extends Command {
              static paths = [
                [`foo`],
              ];

              bar = Option.String(`--bar`, {arity: 3, completion: spy});

              async execute() {}
            }

            const cli = () => {
              return [
                FooCommand,
              ];
            };

            await completeCli(cli, {
              current: `foo --bar abcd`,
              prefix: `foo --bar ab`,
            });

            await completeCli(cli, {
              current: `foo --bar abcd abcd`,
              prefix: `foo --bar abcd ab`,
            });

            await completeCli(cli, {
              current: `foo --bar abcd abcd abcd`,
              prefix: `foo --bar abcd abcd ab`,
            });

            await completeCli(cli, {
              current: `foo --bar abcd abcd abcd --bar abcd`,
              prefix: `foo --bar abcd abcd abcd --bar ab`,
            });

            await completeCli(cli, {
              current: `foo --bar abcd abcd abcd --bar abcd abcd`,
              prefix: `foo --bar abcd abcd abcd --bar abcd ab`,
            });

            await completeCli(cli, {
              current: `foo --bar abcd abcd abcd --bar abcd abcd abcd`,
              prefix: `foo --bar abcd abcd abcd --bar abcd abcd ab`,
            });

            expect(spy).to.have.been.called.exactly(6);
          });

          it(`array option values`, async () => {
            let calls = 0;

            const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
              ++calls;

              expect(request).to.deep.equal({
                current: `abcd`,
                prefix: `ab`,
                suffix: `cd`,
              });
              expect(command.bar).to.deep.equal(new Array(Math.trunc((calls - 1) / 2) + 1).fill(`abcd`));

              return [];
            }));

            class FooCommand extends Command {
              static paths = [
                [`foo`],
              ];

              bar = Option.Array(`--bar`, {completion: spy});

              async execute() {}
            }

            const cli = () => {
              return [
                FooCommand,
              ];
            };

            await completeCli(cli, {
              current: `foo --bar abcd`,
              prefix: `foo --bar ab`,
            });

            await completeCli(cli, {
              current: `foo --bar=abcd`,
              prefix: `foo --bar=ab`,
            });

            await completeCli(cli, {
              current: `foo --bar abcd --bar abcd`,
              prefix: `foo --bar abcd --bar ab`,
            });

            await completeCli(cli, {
              current: `foo --bar=abcd --bar=abcd`,
              prefix: `foo --bar=abcd --bar=ab`,
            });

            expect(spy).to.have.been.called.exactly(4);
          });

          it(`array option values (tuples)`, async () => {
            let calls = 0;

            const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
              ++calls;

              expect(request).to.deep.equal({
                current: `abcd`,
                prefix: `ab`,
                suffix: `cd`,
              });
              expect(command.bar).to.deep.equal([...new Array(Math.trunc((calls - 1) / 3)).fill(new Array(3).fill(`abcd`)), new Array(calls % 3 || 3).fill(`abcd`)]);

              return [];
            }));

            class FooCommand extends Command {
              static paths = [
                [`foo`],
              ];

              bar = Option.Array(`--bar`, {arity: 3, completion: spy});

              async execute() {}
            }

            const cli = () => {
              return [
                FooCommand,
              ];
            };

            await completeCli(cli, {
              current: `foo --bar abcd`,
              prefix: `foo --bar ab`,
            });

            await completeCli(cli, {
              current: `foo --bar abcd abcd`,
              prefix: `foo --bar abcd ab`,
            });

            await completeCli(cli, {
              current: `foo --bar abcd abcd abcd`,
              prefix: `foo --bar abcd abcd ab`,
            });

            await completeCli(cli, {
              current: `foo --bar abcd abcd abcd --bar abcd`,
              prefix: `foo --bar abcd abcd abcd --bar ab`,
            });

            await completeCli(cli, {
              current: `foo --bar abcd abcd abcd --bar abcd abcd`,
              prefix: `foo --bar abcd abcd abcd --bar abcd ab`,
            });

            await completeCli(cli, {
              current: `foo --bar abcd abcd abcd --bar abcd abcd abcd`,
              prefix: `foo --bar abcd abcd abcd --bar abcd abcd ab`,
            });

            expect(spy).to.have.been.called.exactly(6);
          });

          it(`required string option values`, async () => {
            const spy = chai.spy(identity<CompletionFunction<FooCommand>>((request, command) => {
              expect(request).to.deep.equal({
                current: `abcd`,
                prefix: `ab`,
                suffix: `cd`,
              });
              expect(command.bar).to.equal(`abcd`);

              return [];
            }));

            class FooCommand extends Command {
              static paths = [
                [`foo`],
              ];

              bar = Option.String(`--bar`, {required: true, completion: spy});

              async execute() {}
            }

            const cli = () => {
              return [
                FooCommand,
              ];
            };

            await completeCli(cli, {
              current: `foo --bar abcd`,
              prefix: `foo --bar ab`,
            });

            await completeCli(cli, {
              current: `foo --bar=abcd`,
              prefix: `foo --bar=ab`,
            });

            await completeCli(cli, {
              current: `foo --bar abcd --bar abcd`,
              prefix: `foo --bar abcd --bar ab`,
            });


            await completeCli(cli, {
              current: `foo --bar=abcd --bar=abcd`,
              prefix: `foo --bar=abcd --bar=ab`,
            });

            expect(spy).to.have.been.called.exactly(4);
          });
        });
      });
    });
  });
});
