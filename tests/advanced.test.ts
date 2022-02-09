import chaiAsPromised                                                          from 'chai-as-promised';
import chai, {expect}                                                          from 'chai';
import getStream                                                               from 'get-stream';
import {PassThrough}                                                           from 'stream';
import * as t                                                                  from 'typanion';

import {Cli, CommandClass, Command, CliOptions, Option, Builtins, BaseContext} from '../sources/advanced';

chai.use(chaiAsPromised);

const log = <T extends Command>(command: T, properties: Array<keyof T> = []) => {
  command.context.stdout.write(`Running ${command.constructor.name}\n`);

  for (const property of properties) {
    command.context.stdout.write(`${JSON.stringify(command[property])}\n`);
  }
};

const runCli = async (cli: Cli | (() => Array<CommandClass>), args: Array<string>) => {
  let finalCli;

  if (typeof cli === `function`) {
    finalCli = new Cli();

    for (const command of cli()) {
      finalCli.register(command);
    }
  } else {
    finalCli = cli;
  }

  const stream = new PassThrough();
  const promise = getStream(stream);

  const exitCode = await finalCli.run(args, {
    stdin: process.stdin,
    stdout: stream,
    stderr: stream,
  });

  stream.end();

  const output = await promise;

  if (exitCode !== 0)
    throw new Error(output);

  return output;
};

const prefix = `\u001b[1m$ \u001b[22m`;

describe(`Advanced`, () => {
  describe(`Builtin Entries`, () => {
    describe(`help`, () => {
      it(`should have a path`, async () => {
        const cli = new Cli();

        cli.register(class CommandA extends Command {
          async execute() {}
        });

        cli.register(class CommandB extends Command {
          static paths = [[`b`]];
          async execute() {}
        });

        cli.register(class CommandB1 extends Command {
          static paths = [[`b`, `one`]];
          async execute() {}
        });

        cli.register(class CommandB2 extends Command {
          static paths = [[`b`, `two`]];
          async execute() {}
        });

        expect(cli.process([`-h`]).path).to.deep.equal([]);

        cli.register(Builtins.HelpCommand);
        expect(cli.process([`-h`]).path).to.deep.equal([`-h`]);

        expect(cli.process([`b`, `--help`]).path).to.deep.equal([`b`]);
        expect(cli.process([`b`, `one`, `--help`]).path).to.deep.equal([`b`, `one`]);
      });

      it(`should display the usage`, async () => {
        const cli = new Cli();
        cli.register(Builtins.HelpCommand);

        expect(await runCli(cli, [`-h`])).to.equal(cli.usage(null));
        expect(await runCli(cli, [`--help`])).to.equal(cli.usage(null));
      });

      it(`should display the usage per-command`, async () => {
        const cli = new Cli();
        cli.register(Builtins.HelpCommand);

        class CommandA extends Command {
          static paths = [[`foo`]];

          foo = Option.Boolean(`--foo`);
          async execute() {log(this);}
        }

        cli.register(CommandA);

        expect(await runCli(cli, [`foo`, `-h`])).to.equal(cli.usage(CommandA));
        expect(await runCli(cli, [`foo`, `--help`])).to.equal(cli.usage(CommandA));
      });

      it(`should display the command usage if there's a single one and it's the default`, async () => {
        const cli = new Cli();
        cli.register(Builtins.HelpCommand);

        class CommandA extends Command {
          static usage = {};

          foo = Option.Boolean(`--foo`);
          async execute() {log(this);}
        }

        cli.register(CommandA);

        expect(await runCli(cli, [`-h`])).to.equal(cli.usage(CommandA));
        expect(await runCli(cli, [`--help`])).to.equal(cli.usage(CommandA));
      });

      it(`should print the command usage if there are no documented named commands apart the default one`, async () => {
        const cli = new Cli();
        cli.register(Builtins.HelpCommand);

        class CommandA extends Command {
          static paths = [[`foo`]];

          foo = Option.Boolean(`--foo`);
          async execute() {log(this);}
        }

        class CommandB extends Command {
          foo = Option.Boolean(`--fobar`);
          async execute() {log(this);}
        }

        cli.register(CommandA);
        cli.register(CommandB);

        expect(await runCli(cli, [`-h`])).to.equal(cli.usage(CommandB));
        expect(await runCli(cli, [`--help`])).to.equal(cli.usage(CommandB));
      });

      it(`should print the general help if there's a single named command`, async () => {
        const cli = new Cli();
        cli.register(Builtins.HelpCommand);

        class CommandA extends Command {
          static paths = [[`foo`]];

          foo = Option.Boolean(`--foo`);
          async execute() {log(this);}
        }

        cli.register(CommandA);

        expect(await runCli(cli, [`-h`])).to.equal(cli.usage(null));
        expect(await runCli(cli, [`--help`])).to.equal(cli.usage(null));
      });

      it(`should print the general help if there are documented named commands apart the default one`, async () => {
        const cli = new Cli();
        cli.register(Builtins.HelpCommand);

        class CommandA extends Command {
          static paths = [[`foo`]];
          static usage = {};

          foo = Option.Boolean(`--foo`);
          async execute() {log(this);}
        }

        class CommandB extends Command {
          foo = Option.Boolean(`--fobar`);
          async execute() {log(this);}
        }

        cli.register(CommandA);
        cli.register(CommandB);

        expect(await runCli(cli, [`-h`])).to.equal(cli.usage(null));
        expect(await runCli(cli, [`--help`])).to.equal(cli.usage(null));
      });
    });

    describe(`version`, () => {
      it(`should display the version of the binary`, async () => {
        const cli = new Cli({binaryVersion: `2.3.4`});
        cli.register(Builtins.VersionCommand);

        expect(await runCli(cli, [`-v`])).to.equal(`2.3.4\n`);
        expect(await runCli(cli, [`--version`])).to.equal(`2.3.4\n`);
      });

      it(`should display "<unknown>" when no version is specified`, async () => {
        const cli = new Cli();
        cli.register(Builtins.VersionCommand);

        expect(await runCli(cli, [`-v`])).to.equal(`<unknown>\n`);
        expect(await runCli(cli, [`--version`])).to.equal(`<unknown>\n`);
      });
    });
  });

  it(`should print the general help listing when using --help on the raw command`, async () => {
    const output = await runCli(() => {
      class CommandHelp extends Command {
        static paths = [[`-h`], [`--help`]];
        async execute() {
          this.context.stdout.write(this.cli.usage(null));
        }
      }

      class CommandA extends Command {
        static paths = [[`a`]];
        async execute() {log(this);}
      }

      return [
        CommandHelp,
        CommandA,
      ];
    }, [
      `--help`,
    ]);

    expect(output).to.include(`${prefix}... <command>\n`);
  });

  it(`should print the help message when using --help`, async () => {
    const output = await runCli(() => {
      class CommandA extends Command {
        foo = Option.Boolean(`--foo`);
        async execute() {log(this);}
      }

      return [
        CommandA,
      ];
    }, [
      `--help`,
    ]);

    expect(output).to.equal(`${prefix}... [--foo]\n`);
  });

  it(`shouldn't detect --help past the -- separator`, async () => {
    const output = await runCli(() => {
      class CommandA extends Command {
        arg = Option.String();
        async execute() {log(this);}
      }
      return [
        CommandA,
      ];
    }, [
      `--`,
      `--help`,
    ]);

    expect(output).to.equal(`Running CommandA\n`);
  });

  it(`shouldn't detect --help on proxies`, async () => {
    const output = await runCli(() => {
      class CommandA extends Command {
        args = Option.Proxy();
        async execute() {log(this, [`args`]);}
      }
      return [
        CommandA,
      ];
    }, [
      `--help`,
    ]);

    expect(output).to.equal(`Running CommandA\n["--help"]\n`);
  });

  it(`should replace binary name in command help`, async () => {
    const output = await runCli(() => {
      class CommandA extends Command {
        static paths = [[`add`]];
        async execute() {log(this);}
      }
      return [
        CommandA,
      ];
    }, [
      `add`,
      `--help`,
    ]);

    expect(output).to.equal(`${prefix}... add\n`);
    expect(output).not.to.equal(`$0`);
  });

  it(`should expose Cli options on the MiniCli`, async () => {
    const binaryInfo: CliOptions = {
      binaryLabel: `My CLI`,
      binaryName: `my-cli`,
      binaryVersion: `1.0.0`,
      enableCapture: false,
      enableColors: false,
    };

    const cli = new Cli(binaryInfo);

    cli.register(
      class CommandA extends Command {
        async execute() {
          this.context.stdout.write(JSON.stringify(this.cli));
        }
      }
    );

    const output = await runCli(cli, []);

    expect(JSON.parse(output)).to.contain(binaryInfo);
  });

  it(`should allow calling a command from another`, async () => {
    const output = await runCli(() => {
      class CommandA extends Command {
        static paths = [[`foo`]];
        async execute() {
          log(this);
          this.cli.run([`bar`]);
        }
      }

      class CommandB extends Command {
        static paths = [[`bar`]];
        async execute() {
          log(this);
        }
      }

      return [
        CommandA,
        CommandB,
      ];
    }, [`foo`]);

    expect(output).to.equal(`Running CommandA\nRunning CommandB\n`);
  });

  it(`should support inheritance of options`, async () => {
    const output = await runCli(() => {
      abstract class CommandA extends Command {
        foo = Option.String(`--foo`);
        abstract execute(): Promise<number | void>;
      }

      class CommandB extends CommandA {
        async execute() {
          log(this, [`foo`]);
        }
      }

      return [
        CommandB,
      ];
    }, [`--foo`, `hello`]);

    expect(output).to.equal(`Running CommandB\n"hello"\n`);
  });

  it(`should support inheritance of positionals (consumed starting from the superclass)`, async () => {
    const output = await runCli(() => {
      abstract class CommandA extends Command {
        foo = Option.String();
        abstract execute(): Promise<number | void>;
      }

      class CommandB extends CommandA {
        bar = Option.String();
        async execute() {
          log(this, [`foo`, `bar`]);
        }
      }

      return [
        CommandB,
      ];
    }, [`hello`, `world`]);

    expect(output).to.equal(`Running CommandB\n"hello"\n"world"\n`);
  });

  it(`derives positional argument names from the property name`, async () => {
    class CommandA extends Command {
      workspaceName = Option.String();
      extra = Option.String({required: false});
      scriptName = Option.String();

      static paths = [[`workspace`]];
      async execute() {
        throw new Error(`not implemented, just testing usage()`);
      }
    }

    const cli = Cli.from([CommandA]);

    expect(cli.usage(CommandA)).to.equal(`\u001b[1m$ \u001b[22m... workspace <workspaceName> [extra] <scriptName>\n`);
  });

  it(`derives rest argument names from the property name`, async () => {
    class CommandA extends Command {
      workspaceNames = Option.Rest({required: 2});

      static paths = [[`clean`]];
      async execute() {
        throw new Error(`not implemented, just testing usage()`);
      }
    }

    const cli = Cli.from([CommandA]);

    expect(cli.usage(CommandA)).to.equal(`\u001b[1m$ \u001b[22m... clean <workspaceNames> <workspaceNames> ...\n`);
  });

  it(`supports populating strings with environment variables`, async () => {
    class CommandA extends Command {
      foo = Option.String(`--foo`, {env: `TEST_FOO`});

      async execute() {
        log(this, [`foo`]);
      }
    }

    const cli = Cli.from([CommandA]);

    expect(cli.process([], {env: {TEST_FOO: `bar`}})).to.contain({foo: `bar`});
  });

  it(`overrides defaults with environment variables`, async () => {
    class CommandA extends Command {
      foo = Option.String(`--foo`, `foo`, {env: `TEST_FOO`});

      async execute() {
        log(this, [`foo`]);
      }
    }

    const cli = Cli.from([CommandA]);

    expect(cli.process([], {env: {TEST_FOO: `bar`}})).to.contain({foo: `bar`});
  });

  it(`overrides environment variables with options`, async () => {
    class CommandA extends Command {
      foo = Option.String(`--foo`, {env: `TEST_FOO`});

      async execute() {
        log(this, [`foo`]);
      }
    }

    const cli = Cli.from([CommandA]);

    expect(cli.process([`--foo=qux`], {env: {TEST_FOO: `bar`}})).to.contain({foo: `qux`});
  });

  it(`supports strings that act like booleans if not bound to a value`, async () => {
    class CommandA extends Command {
      enableDebugger = Option.String(`--break`, false, {tolerateBoolean: true});

      async execute() {
        log(this, [`enableDebugger`]);
      }
    }

    class InvertedCommandA extends Command {
      enableDebugger = Option.String(`--break`, true, {tolerateBoolean: true});

      async execute() {
        log(this, [`enableDebugger`]);
      }
    }

    let cli = Cli.from([CommandA]);

    expect(cli.process([])).to.contain({enableDebugger: false});
    expect(cli.process([`--break`])).to.contain({enableDebugger: true});
    expect(cli.process([`--no-break`])).to.contain({enableDebugger: false});
    expect(cli.process([`--break=1234`])).to.contain({enableDebugger: `1234`});
    expect(() => { cli.process([`--break`, `1234`]);}).to.throw(Error);
    expect(() => { cli.process([`--no-break=1234`]);}).to.throw(Error);

    cli = Cli.from([InvertedCommandA]);

    expect(cli.process([])).to.contain({enableDebugger: true});
    expect(cli.process([`--break`])).to.contain({enableDebugger: true});
    expect(cli.process([`--no-break`])).to.contain({enableDebugger: false});
  });

  it(`shouldn't crash when throwing non-error exceptions`, async () => {
    await expect(runCli(() => {
      class CommandA extends Command {
        async execute() {throw 42;}
      }

      return [
        CommandA,
      ];
    }, [])).to.be.rejectedWith(`non-error rejection`);
  });

  it(`shouldn't crash when throwing non-error exceptions`, async () => {
    class CommandA extends Command {
      thisNameIsntUsed = Option.String({name: `prettyName`});
      async execute() {throw 42;}
    }

    const cli = Cli.from([CommandA]);
    const usage = cli.usage(CommandA);

    expect(usage).not.to.contain(`thisNameIsntUsed`);
    expect(usage).to.contain(`prettyName`);

    const command = cli.process([`foo`]);

    expect((command as CommandA).thisNameIsntUsed).to.eq(`foo`);
  });

  it(`should use default error handler when no custom logic is registered`, async () => {
    await expect(runCli(() => {
      class CommandA extends Command {
        async execute() {throw new Error(`default error`);}
      }

      return [
        CommandA,
      ];
    }, [])).to.be.rejectedWith(`default error`);
  });

  it(`should allow to override error handler`, async () => {
    let catchCalled = false;

    await expect(runCli(() => {
      class CommandA extends Command {
        async execute() {throw new Error(`command failed`);}
        async catch(error: Error) {
          catchCalled = true;
          throw error;
        }
      }

      return [
        CommandA,
      ];
    }, [])).to.be.rejectedWith(`command failed`);

    expect(catchCalled).to.be.true;
  });

  it(`should not throw if custom error handler swallows error`, async () => {
    await expect(runCli(() => {
      class CommandA extends Command {
        async execute() {throw new Error(`command failed`);}
        async catch() {}
      }

      return [
        CommandA,
      ];
    }, [])).to.eventually.equal(``);
  });

  it(`should allow to rethrow error to parent class(es)`, async () => {
    const calls = {
      base: false,
      commandA: false,
      commandB: false,
    };

    await expect(runCli(() => {
      class Base extends Command {
        async execute() {}
        async catch(error: Error) {
          calls.base = true;
          return super.catch(error);
        }
      }

      class CommandA extends Base {
        async execute() {}
        async catch(error: Error) {
          calls.commandA = true;
          return super.catch(error);
        }
      }

      class CommandB extends CommandA {
        async execute() {throw new Error(`command failed`);}
        async catch(error: Error) {
          calls.commandB = true;
          return super.catch(error);
        }
      }

      return [
        CommandB,
      ];
    }, [])).to.be.rejectedWith(`command failed`);

    expect(Object.values(calls).every(Boolean)).to.be.true;
  });

  it(`should extract counter options from complex options`, async () => {
    class CommandA extends Command {
      verbose = Option.Counter(`-v,--verbose`, 0);
      async execute() {}
    }

    const cli = Cli.from([CommandA]);

    expect(cli.process([])).to.contain({verbose: 0});
    expect(cli.process([`-v`])).to.contain({verbose: 1});
    expect(cli.process([`-vv`])).to.contain({verbose: 2});
    expect(cli.process([`-vvv`])).to.contain({verbose: 3});
    expect(cli.process([`-vvvv`])).to.contain({verbose: 4});

    expect(cli.process([`-v`, `-v`])).to.contain({verbose: 2});
    expect(cli.process([`--verbose`, `--verbose`])).to.contain({verbose: 2});
    expect(cli.process([`-v`, `--verbose`])).to.contain({verbose: 2});
    expect(cli.process([`--verbose`, `-v`])).to.contain({verbose: 2});

    expect(cli.process([`-vvvv`, `--no-verbose`])).to.contain({verbose: 0});
    expect(cli.process([`--no-verbose`, `-vvvv`])).to.contain({verbose: 4});
  });

  it(`should print flags with a description separately`, async () => {
    class CommandA extends Command {
      verbose = Option.Boolean(`--verbose`, {description: `Log output`});
      output = Option.String(`--output`, {description: `The output directory`});
      message = Option.String(`--message`);

      static paths = [[`greet`]];
      async execute() {
        throw new Error(`not implemented, just testing usage()`);
      }
    }

    const cli = Cli.from([CommandA]);

    // eslint-disable-next-line no-control-regex
    expect(cli.usage(CommandA, {detailed: true})).to.match(/\u001b\[1m\$ \u001b\[22m\.\.\. greet \[--message #0\]\n\n\u001b\[1m━━━ Options .*\n\n +\S*--verbose *\S* +Log output\n +\S*--output #0 *\S* +The output directory\n/);
  });

  it(`should support tuples`, async () => {
    class PointCommand extends Command {
      point = Option.String(`--point`, {arity: 3});
      async execute() {}
    }

    const cli = Cli.from([PointCommand]);

    expect(cli.process([`--point`, `1`, `2`, `3`])).to.deep.contain({point: [`1`, `2`, `3`]});
  });

  it(`should extract tuples from complex options surrounded by rest arguments`, async () => {
    class PointCommand extends Command {
      point = Option.String(`--point`, {arity: 3});
      rest = Option.Rest();
      async execute() {}
    }

    const cli = Cli.from([PointCommand]);

    const point = {point: [`1`, `2`, `3`]};

    expect(cli.process([`--point`, `1`, `2`, `3`])).to.deep.contain(point);
    expect(cli.process([`--point`, `1`, `2`, `3`, `thing1`, `thing2`])).to.deep.contain(point);
    expect(cli.process([`thing1`, `--point`, `1`, `2`, `3`, `thing2`])).to.deep.contain(point);
    expect(cli.process([`thing1`, `thing2`, `--point`, `1`, `2`, `3`])).to.deep.contain(point);
  });

  it(`should throw acceptable errors when tuple length is not finite`, async () => {
    class PointCommand extends Command {
      point = Option.String(`--point`, {arity: Infinity});
      async execute() {}
    }

    expect(() => {
      Cli.from([PointCommand]);
    }).to.throw(`The arity must be an integer, got Infinity`);
  });

  it(`should throw acceptable errors when tuple length is not an integer`, async () => {
    class PointCommand extends Command {
      // @ts-expect-error: Even TS realizes that the arity is wrong
      point = Option.String(`--point`, {arity: 1.5});
      async execute() {}
    }

    expect(() => {
      Cli.from([PointCommand]);
    }).to.throw(`The arity must be an integer, got 1.5`);
  });

  it(`should throw acceptable errors when tuple length is not positive`, async () => {
    class PointCommand extends Command {
      // @ts-expect-error: Even TS realizes that the arity is wrong
      point = Option.String(`--point`, {arity: -1});
      async execute() {}
    }

    expect(() => {
      Cli.from([PointCommand]);
    }).to.throw(`The arity must be positive, got -1`);
  });

  it(`should throw acceptable errors when not enough arguments are passed to a tuple`, async () => {
    class PointCommand extends Command {
      point = Option.String(`--point`, {arity: 3});
      async execute() {}
    }

    const cli = Cli.from([PointCommand]);

    const error = `Not enough arguments to option --point.`;

    for (const args of [
      [`--point`],
      [`--point`, `1`],
      [`--point`, `1`, `2`],
      [`--point`, `1`, `--foo`],
      [`--point`, `1`, `-abcd`],
      [`--point`, `1`, `2`, `--bar=baz`],
    ]) {
      expect(() => cli.process(args)).to.throw(error);
    }
  });

  it(`should extract string arrays from complex options`, async () => {
    class IncludeCommand extends Command {
      include = Option.Array(`--include`, []);
      async execute() {}
    }

    const cli = Cli.from([IncludeCommand]);

    expect(cli.process([])).to.deep.contain({include: []});
    expect(cli.process([`--include`, `foo`])).to.deep.contain({include: [`foo`]});
    expect(cli.process([`--include`, `foo`, `--include`, `bar`])).to.deep.contain({include: [`foo`, `bar`]});
  });

  it(`should extract tuple arrays from complex options`, async () => {
    class IncludeCommand extends Command {
      position = Option.Array(`--position`, [], {arity: 3});
      async execute() {}
    }

    const cli = Cli.from([IncludeCommand]);

    expect(cli.process([])).to.deep.contain({position: []});

    expect(cli.process(
      [`--position`, `1`, `2`, `3`]
    )).to.deep.contain({position: [[`1`, `2`, `3`]]});

    expect(cli.process([
      `--position`, `1`, `2`, `3`,
      `--position`, `4`, `5`, `6`,
    ])).to.deep.contain({position: [[`1`, `2`, `3`], [`4`, `5`, `6`]]});

    expect(cli.process([
      `--position`, `1`, `2`, `3`,
      `--position`, `4`, `5`, `6`,
      `--position`, `7`, `8`, `9`,
    ])).to.deep.contain({position: [[`1`, `2`, `3`], [`4`, `5`, `6`], [`7`, `8`, `9`]]});
  });

  it(`should support optional string positionals`, async () => {
    class ThingCommand extends Command {
      thing = Option.String({required: false});
      async execute() {}
    }

    const cli = Cli.from([ThingCommand]);

    expect(cli.process([])).to.contain({thing: undefined});
    expect(cli.process([`hello`])).to.contain({thing: `hello`});
  });

  it(`should support optional string positionals after required string positionals`, async () => {
    class CopyCommand extends Command {
      requiredThing = Option.String();
      optionalThing = Option.String({required: false});
      async execute() {}
    }

    const cli = Cli.from([CopyCommand]);

    expect(cli.process([`hello`])).to.contain({optionalThing: undefined});
    expect(cli.process([`hello`, `world`])).to.contain({optionalThing: `world`});
  });

  it(`should support optional string positionals before required string positionals`, async () => {
    class CopyCommand extends Command {
      optionalThing = Option.String({required: false});
      requiredThing = Option.String();
      async execute() {}
    }

    const cli = Cli.from([CopyCommand]);

    expect(cli.process([`hello`])).to.contain({optionalThing: undefined, requiredThing: `hello`});
    expect(cli.process([`hello`, `world`])).to.contain({optionalThing: `hello`, requiredThing: `world`});
  });

  it(`should support required positionals after rest arguments`, async () => {
    class CopyCommand extends Command {
      sources = Option.Rest();
      destination = Option.String();
      async execute() {}
    }

    const cli = Cli.from([CopyCommand]);

    expect(cli.process([`dest`])).to.deep.contain({
      sources: [],
      destination: `dest`,
    });

    expect(cli.process([`src`, `dest`])).to.deep.contain({
      sources: [`src`],
      destination: `dest`,
    });

    expect(cli.process([`src1`, `src2`, `dest`])).to.deep.contain({
      sources: [`src1`, `src2`],
      destination: `dest`,
    });
  });

  it(`should support rest arguments with a minimum required length`, async () => {
    class CopyCommand extends Command {
      sources = Option.Rest({required: 1});
      async execute() {}
    }

    const cli = Cli.from([CopyCommand]);

    expect(() => cli.process([])).to.throw();
    expect(cli.process([`src1`])).to.deep.contain({sources: [`src1`]});
    expect(cli.process([`src1`, `src2`])).to.deep.contain({sources: [`src1`, `src2`]});
    expect(cli.process([`src1`, `src2`, `src3`])).to.deep.contain({sources: [`src1`, `src2`, `src3`]});
  });

  it(`should support required positionals after rest arguments with a minimum required length`, async () => {
    class CopyCommand extends Command {
      sources = Option.Rest({required: 1});
      destination = Option.String();
      async execute() {}
    }

    const cli = Cli.from([CopyCommand]);

    expect(() => cli.process([])).to.throw();
    expect(() => cli.process([`src`])).to.throw();
    expect(() => cli.process([`dest`])).to.throw();

    expect(cli.process([`src`, `dest`])).to.deep.contain({
      sources: [`src`],
      destination: `dest`,
    });

    expect(cli.process([`src1`, `src2`, `dest`])).to.deep.contain({
      sources: [`src1`, `src2`],
      destination: `dest`,
    });
  });

  // We have this in the README, that's why we're testing it
  it(`should support implementing a cp-like command`, async () => {
    class CopyCommand extends Command {
      sources = Option.Rest({required: 1});
      destination = Option.String();
      force = Option.Boolean(`-f,--force`, false);
      reflink = Option.String(`--reflink`, false, {tolerateBoolean: true});
      async execute() {}
    }

    const cli = Cli.from([CopyCommand]);

    expect(cli.process([`src`, `dest`])).to.deep.contain({
      sources: [`src`],
      destination: `dest`,
      force: false,
      reflink: false,
    });

    expect(cli.process([`src1`, `src2`, `dest`])).to.deep.contain({
      sources: [`src1`, `src2`],
      destination: `dest`,
      force: false,
      reflink: false,
    });

    expect(cli.process([`src1`, `--force`, `src2`, `dest`])).to.deep.contain({
      sources: [`src1`, `src2`],
      destination: `dest`,
      force: true,
      reflink: false,
    });

    expect(cli.process([`src1`, `src2`, `--force`, `dest`])).to.deep.contain({
      sources: [`src1`, `src2`],
      destination: `dest`,
      force: true,
      reflink: false,
    });

    expect(cli.process([`src1`, `src2`, `--reflink`, `dest`])).to.deep.contain({
      sources: [`src1`, `src2`],
      destination: `dest`,
      force: false,
      reflink: true,
    });

    expect(cli.process([`src1`, `--reflink=always`, `src2`, `dest`])).to.deep.contain({
      sources: [`src1`, `src2`],
      destination: `dest`,
      force: false,
      reflink: `always`,
    });

    expect(() => cli.process([`dest`])).to.throw();
  });

  it(`should support proxies`, async () => {
    class CopyCommand extends Command {
      args = Option.Proxy();
      async execute() {}
    }

    const cli = Cli.from([CopyCommand]);

    expect(cli.process([])).to.deep.contain({args: []});
    expect(cli.process([`foo`])).to.deep.contain({args: [`foo`]});
    expect(cli.process([`foo`, `--bar`])).to.deep.contain({args: [`foo`, `--bar`]});
    expect(cli.process([`foo`, `--bar`, `--baz=1`])).to.deep.contain({args: [`foo`, `--bar`, `--baz=1`]});
  });

  it(`should support proxies with a minimum required length`, async () => {
    class CopyCommand extends Command {
      args = Option.Proxy({required: 1})
      async execute() {}
    }

    const cli = Cli.from([CopyCommand]);

    expect(() => cli.process([])).to.throw();
    expect(cli.process([`foo`])).to.deep.contain({args: [`foo`]});
    expect(cli.process([`foo`, `--bar`])).to.deep.contain({args: [`foo`, `--bar`]});
    expect(cli.process([`foo`, `--bar`, `--baz=1`])).to.deep.contain({args: [`foo`, `--bar`, `--baz=1`]});
  });

  it(`should not allow negating options with arity 1 that already start with "--no-"`, async () => {
    class FooCommand extends Command {
      noRedacted = Option.Boolean(`--no-redacted`);
      async execute() {}
    }

    const cli = Cli.from([FooCommand]);

    expect(() => cli.process([`--no-redacted`])).not.to.throw();
    expect(() => cli.process([`--redacted`])).to.throw(`Unsupported option name ("--redacted")`);
    expect(() => cli.process([`--no-no-redacted`])).to.throw(`Unsupported option name ("--no-no-redacted")`);
    expect(() => cli.process([`--no-no-no-redacted`])).to.throw(`Unsupported option name ("--no-no-no-redacted")`);
  });

  it(`should extract required string options from complex options`, async () => {
    class IncludeCommand extends Command {
      foo = Option.String(`--foo`, {required: true});
      async execute() {}
    }

    const cli = Cli.from([IncludeCommand]);

    expect(() => cli.process([])).to.throw(`Command not found; did you mean:`);
    expect(cli.process([`--foo`, `bar`])).to.deep.contain({foo: `bar`});
    expect(cli.process([`--foo`, `bar`, `--foo`, `baz`])).to.deep.contain({foo: `baz`});
  });

  it(`should extract required array options from complex options`, async () => {
    class IncludeCommand extends Command {
      foo = Option.Array(`--foo`, {required: true});
      async execute() {}
    }

    const cli = Cli.from([IncludeCommand]);

    expect(() => cli.process([])).to.throw(`Command not found; did you mean:`);
    expect(cli.process([`--foo`, `bar`])).to.deep.contain({foo: [`bar`]});
    expect(cli.process([`--foo`, `bar`, `--foo`, `baz`])).to.deep.contain({foo: [`bar`, `baz`]});
  });

  it(`should extract required boolean options from complex options`, async () => {
    class IncludeCommand extends Command {
      foo = Option.Boolean(`--foo`, {required: true});
      async execute() {}
    }

    const cli = Cli.from([IncludeCommand]);

    expect(() => cli.process([])).to.throw(`Command not found; did you mean:`);
    expect(cli.process([`--foo`])).to.deep.contain({foo: true});
    expect(cli.process([`--foo`, `--foo`])).to.deep.contain({foo: true});
    expect(cli.process([`--no-foo`])).to.deep.contain({foo: false});
  });

  it(`should extract required boolean options from complex options (multiple names)`, async () => {
    class IncludeCommand extends Command {
      foo = Option.Boolean(`-f,--foo`, {required: true});
      async execute() {}
    }

    const cli = Cli.from([IncludeCommand]);

    expect(() => cli.process([])).to.throw(`Command not found; did you mean:`);
    expect(cli.process([`--foo`])).to.deep.contain({foo: true});
    expect(cli.process([`-f`])).to.deep.contain({foo: true});
    expect(cli.process([`--foo`, `-f`])).to.deep.contain({foo: true});
    expect(cli.process([`--no-foo`])).to.deep.contain({foo: false});
  });

  it(`should extract required counter options from complex options`, async () => {
    class IncludeCommand extends Command {
      foo = Option.Counter(`--foo`, {required: true});
      async execute() {}
    }

    const cli = Cli.from([IncludeCommand]);

    expect(() => cli.process([])).to.throw(`Command not found; did you mean:`);
    expect(cli.process([`--foo`])).to.deep.contain({foo: 1});
    expect(cli.process([`--foo`, `--foo`])).to.deep.contain({foo: 2});
    expect(cli.process([`--no-foo`])).to.deep.contain({foo: 0});
  });

  it(`should disambiguate commands by required options`, async () => {
    class BaseCommand extends Command {
      async execute() {
        log(this);
      }
    }

    class RootCommand extends BaseCommand {
    }
    class FooCommand extends BaseCommand {
      foo = Option.Boolean(`--foo`, {required: true});
    }

    class BarCommand extends BaseCommand {
      bar = Option.Boolean(`--bar`, {required: true});
    }

    class FooBarCommand extends BaseCommand {
      foo = Option.Boolean(`--foo`, {required: true});
      bar = Option.Boolean(`--bar`, {required: true});
    }

    const cli = Cli.from([RootCommand, FooCommand, BarCommand, FooBarCommand]);

    expect(await runCli(cli, [])).to.equal(`Running RootCommand\n`);
    expect(await runCli(cli, [`--foo`])).to.equal(`Running FooCommand\n`);
    expect(await runCli(cli, [`--bar`])).to.equal(`Running BarCommand\n`);
    expect(await runCli(cli, [`--foo`, `--bar`])).to.equal(`Running FooBarCommand\n`);
  });

  it(`should disambiguate an inheriting command from the parent by required options`, async () => {
    class BaseCommand extends Command {
      async execute() {
        log(this);
      }
    }
    class FooCommand extends BaseCommand {
      foo = Option.Boolean(`--foo`, {required: true});
    }

    class FooBarCommand extends FooCommand {
      bar = Option.Boolean(`--bar`, {required: true});
    }

    const cli = Cli.from([FooCommand, FooBarCommand]);

    await expect(runCli(cli, [])).to.be.rejectedWith(`Command not found; did you mean one of:`);
    expect(await runCli(cli, [`--foo`])).to.equal(`Running FooCommand\n`);
    await expect(runCli(cli, [`--bar`])).to.be.rejectedWith(`Command not found; did you mean:`);
    expect(await runCli(cli, [`--foo`, `--bar`])).to.equal(`Running FooBarCommand\n`);
  });

  it(`should show the reason if the single branch errors`, async () => {
    class BaseCommand extends Command {
      name = Option.String();

      async execute() {
        log(this);
      }
    }

    const cli = Cli.from([BaseCommand]);

    await expect(runCli(cli, [])).to.be.rejectedWith(`Not enough positional arguments.`);
  });

  it(`should show the common reason if all branches error with the same reason`, async () => {
    class BaseCommand extends Command {
      name = Option.String();

      async execute() {
        log(this);
      }
    }

    class FooCommand extends BaseCommand {
      foo = Option.Boolean(`--foo`, {required: true});
    }

    const cli = Cli.from([BaseCommand, FooCommand]);

    await expect(runCli(cli, [])).to.be.rejectedWith(`Not enough positional arguments.`);
  });

  it(`should treat arity 0 as booleans`, async () => {
    class PointCommand extends Command {
      point = Option.String(`--point`, {arity: 0});

      thing = Option.Array(`--thing`, {arity: 0})

      async execute() {}
    }

    const cli = Cli.from([PointCommand]);

    expect(cli.process([`--point`])).to.deep.contain({point: true});
    expect(cli.process([`--thing`, `--thing`, `--no-thing`, `--thing`])).to.deep.contain({thing: [true, true, false, true]});
  });

  it(`should validate the command when it has a schema`, async () => {
    class FooCommand extends Command {
      foo = Option.Boolean(`--foo`, false);
      bar = Option.Boolean(`--bar`, false);

      static schema = [
        t.hasKeyRelationship(`foo`, t.KeyRelationship.Forbids, [`bar`], {ignore: [false]}),
        t.hasKeyRelationship(`bar`, t.KeyRelationship.Forbids, [`foo`], {ignore: [false]}),
      ];

      async execute() {}
    }

    const cli = Cli.from([FooCommand]);

    await expect(runCli(cli, [`--foo`])).to.eventually.equal(``);
    await expect(runCli(cli, [`--bar`])).to.eventually.equal(``);

    await expect(runCli(cli, [`--foo`, `--bar`])).to.be.rejectedWith(`property "foo" forbids using property "bar"`);
  });

  it(`should coerce options when requested`, async () => {
    class FooCommand extends Command {
      foo = Option.String(`--foo`, {validator: t.isNumber()});

      async execute() {
        log(this, [`foo`]);
      }
    }

    const cli = Cli.from([FooCommand]);

    await expect(runCli(cli, [`--foo`, `42`])).to.eventually.equal(`Running FooCommand\n42\n`);
    await expect(runCli(cli, [`--foo`, `ab`])).to.be.rejectedWith(`Invalid value for --foo: expected a number`);
  });

  it(`should coerce positionals when requested`, async () => {
    class FooCommand extends Command {
      foo = Option.String({validator: t.isNumber()});

      async execute() {
        log(this, [`foo`]);
      }
    }

    const cli = Cli.from([FooCommand]);

    await expect(runCli(cli, [`42`])).to.eventually.equal(`Running FooCommand\n42\n`);
    await expect(runCli(cli, [`ab`])).to.be.rejectedWith(`Invalid value for foo: expected a number`);
  });

  it(`should skip coercion for booleans`, async () => {
    class FooCommand extends Command {
      foo = Option.String(`--foo`, {validator: t.isNumber(), tolerateBoolean: true});
      bar = Option.String(`--bar`, false, {validator: t.isNumber(), tolerateBoolean: true});

      async execute() {
        log(this, [`foo`, `bar`]);
      }
    }

    const cli = Cli.from([FooCommand]);

    await expect(runCli(cli, [`--foo=42`])).to.eventually.equal(`Running FooCommand\n42\nfalse\n`);
    await expect(runCli(cli, [`--foo`])).to.eventually.equal(`Running FooCommand\ntrue\nfalse\n`);
  });

  it(`should capture stdout if requested`, async () => {
    class FooCommand extends Command {
      async execute() {
        console.log(`foo`);
      }
    }

    const cli = Cli.from([FooCommand], {enableCapture: true});

    await expect(runCli(cli, [])).to.eventually.equal(`foo\n`);
  });

  it(`should capture stderr if requested`, async () => {
    class FooCommand extends Command {
      async execute() {
        console.error(`foo`);
      }
    }

    const cli = Cli.from([FooCommand], {enableCapture: true});

    await expect(runCli(cli, [])).to.eventually.equal(`foo\n`);
  });

  it(`shouldn't require the context if empty`, async () => {
    class FooCommand extends Command {
      async execute() {
      }
    }

    const cli = Cli.from([FooCommand]);

    // This is a type-only test
    // eslint-disable-next-line no-constant-condition
    await expect(cli.run([])).to.eventually.be.fulfilled;
  });

  it(`should require the context if custom`, async () => {
    type CustomContext = BaseContext & {
      cwd: string;
    };

    class FooCommand extends Command<CustomContext> {
      async execute() {
        return this.context.cwd === `/` ? 42 : 0;
      }
    }

    const cli = Cli.from<CustomContext>([FooCommand]);

    // This is a type-only test
    // eslint-disable-next-line no-constant-condition
    if (0) {
      // @ts-expect-error
      cli.run([]);
      // @ts-expect-error
      cli.run([], {});
    }

    await expect(cli.run([], {cwd: `/`})).to.eventually.equal(42);
    await expect(cli.run([], {...Cli.defaultContext, cwd: `/`})).to.eventually.equal(42);
  });
});
