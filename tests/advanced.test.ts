import chaiAsPromised               from 'chai-as-promised';
import chai, {expect}               from 'chai';
import getStream                    from 'get-stream';
import {PassThrough}                from 'stream';

import { Cli, CommandClass, Command, CliOptions, Arguments, Entries } from '../sources/advanced';

chai.use(chaiAsPromised);

const log = <T extends Command>(command: T, properties: (keyof T)[] = []) => {
    command.context.stdout.write(`Running ${command.constructor.name}\n`);

    for (const property of properties) {
        command.context.stdout.write(`${JSON.stringify(command[property])}\n`);
    }
};

const runCli = async (cli: Cli | (() => CommandClass[]), args: string[]) => {
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

                cli.register(Entries.HelpCommand);
                expect(cli.process([`-h`]).path).to.deep.equal([`-h`]);

                expect(cli.process([`b`, `--help`]).path).to.deep.equal([`b`]);
                expect(cli.process([`b`, `one`, `--help`]).path).to.deep.equal([`b`, `one`]);
            });

            it(`should display the usage`, async () => {
                const cli = new Cli()
                cli.register(Entries.HelpCommand);

                expect(await runCli(cli, [`-h`])).to.equal(cli.usage(null));
                expect(await runCli(cli, [`--help`])).to.equal(cli.usage(null));
            })
        });

        describe(`version`, () => {
            it(`should display the version of the binary`, async () => {
                const cli = new Cli({binaryVersion: `2.3.4`})
                cli.register(Entries.VersionCommand);

                expect(await runCli(cli, [`-v`])).to.equal(`2.3.4\n`);
                expect(await runCli(cli, [`--version`])).to.equal(`2.3.4\n`);

            });

            it(`should display "<unknown>" when no version is specified`, async () => {
                const cli = new Cli()
                cli.register(Entries.VersionCommand);

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
                async execute() {log(this)}
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
                foo = Arguments.Boolean(`--foo`);
                async execute() {log(this)}
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
                arg = Arguments.String();
                async execute() {log(this)}
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
                args = Arguments.Proxy();
                async execute() {log(this, [`args`])}
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
                async execute() {log(this)}
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

    it(`should support inheritance`, async () => {
        const output = await runCli(() => {
            abstract class CommandA extends Command {
                foo = Arguments.String(`--foo`);
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

    it(`derives positional argument names from the property name`, async () => {
        class CommandA extends Command {
            workspaceName = Arguments.String();
            extra = Arguments.String({required: false});
            scriptName = Arguments.String();

            static paths = [[`workspace`]];
            async execute() {
                throw new Error('not implemented, just testing usage()')
            }
        }

        const cli = Cli.from([CommandA])

        expect(cli.usage(CommandA)).to.equal(`\u001b[1m$ \u001b[22m... workspace <workspaceName> [extra] <scriptName>\n`);
    });

    it(`derives rest argument names from the property name`, async () => {
        class CommandA extends Command {
            workspaceNames = Arguments.Rest({required: 2});

            static paths = [[`clean`]];
            async execute() {
                throw new Error('not implemented, just testing usage()')
            }
        }

        const cli = Cli.from([CommandA])

        expect(cli.usage(CommandA)).to.equal(`\u001b[1m$ \u001b[22m... clean <workspaceNames> <workspaceNames> ...\n`);
    });

    it(`supports strings that act like booleans if not bound to a value`, async () => {
        class CommandA extends Command {
            enableDebugger = Arguments.String(`--break`, false, {tolerateBoolean: true});

            async execute() {
                log(this, [`enableDebugger`]);
            }
        }

        class InvertedCommandA extends Command {
            enableDebugger = Arguments.String(`--break`, true, {tolerateBoolean: true});

            async execute() {
                log(this, [`enableDebugger`]);
            }
        }

        let cli = Cli.from([CommandA])

        expect(cli.process([])).to.contain({enableDebugger: false});
        expect(cli.process([`--break`])).to.contain({enableDebugger: true});
        expect(cli.process([`--no-break`])).to.contain({enableDebugger: false});
        expect(cli.process([`--break=1234`])).to.contain({enableDebugger: "1234"});
        expect(() => { cli.process([`--break`, `1234`])}).to.throw(Error);
        expect(() => { cli.process([`--no-break=1234`])}).to.throw(Error);

        cli = Cli.from([InvertedCommandA])

        expect(cli.process([])).to.contain({enableDebugger: true});
        expect(cli.process([`--break`])).to.contain({enableDebugger: true});
        expect(cli.process([`--no-break`])).to.contain({enableDebugger: false});
    });

    it(`shouldn't crash when throwing non-error exceptions`, async () => {
        await expect(runCli(() => {
            class CommandA extends Command {
                async execute() {throw 42}
            }

            return [
                CommandA,
            ];
        }, [])).to.be.rejectedWith(`non-error rejection`);
    });

    it(`shouldn't crash when throwing non-error exceptions`, async () => {
        class CommandA extends Command {
            thisNameIsntUsed = Arguments.String({name: 'prettyName'});
            async execute() {throw 42}
        }

        const cli = Cli.from([CommandA])
        const usage = cli.usage(CommandA);

        expect(usage).not.to.contain('thisNameIsntUsed');
        expect(usage).to.contain('prettyName');

        const command = cli.process(['foo']);

        expect((command as CommandA).thisNameIsntUsed).to.eq('foo');
    });

    it(`should use default error handler when no custom logic is registered`, async () => {
        await expect(runCli(() => {
            class CommandA extends Command {
                async execute() {throw new Error(`default error`)}
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
                async execute() {throw new Error(`command failed`)}
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
                async execute() {throw new Error(`command failed`)}
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
            commandB: false
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
                async execute() {throw new Error(`command failed`)}
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
            verbose = Arguments.Counter(`-v,--verbose`, 0);
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
            verbose = Arguments.Boolean('--verbose', {description: 'Log output'});
            output = Arguments.String('--output', {description: 'The output directory'});
            message = Arguments.String('--message');

            static paths = [[`greet`]];
            async execute() {
                throw new Error('not implemented, just testing usage()')
            }
        }

        const cli = Cli.from([CommandA])

        expect(cli.usage(CommandA, {detailed: true})).to.equal(`\u001b[1m$ \u001b[22m... greet [--message #0]\n\n\u001b[1mOptions:\u001b[22m\n\n  --verbose      Log output\n  --output #0    The output directory\n`);
    });

    it(`should support tuples`, async () => {
        class PointCommand extends Command {
            point = Arguments.String(`--point`, {arity: 3});
            async execute() {}
        }

        const cli = Cli.from([PointCommand]);

        expect(cli.process([`--point`, `1`, `2`, `3`])).to.deep.contain({point: [`1`, `2`, `3`]});
    });

    it(`should extract tuples from complex options surrounded by rest arguments`, async () => {
        class PointCommand extends Command {
            point = Arguments.String(`--point`, {arity: 3});
            rest = Arguments.Rest();
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
            point = Arguments.String(`--point`, {arity: Infinity});
            async execute() {}
        }

        expect(() => {
            Cli.from([PointCommand])
        }).to.throw(`The arity must be an integer, got Infinity`);
    });

    it(`should throw acceptable errors when tuple length is not an integer`, async () => {
        class PointCommand extends Command {
            point = Arguments.String(`--point`, {arity: 1.5});
            async execute() {}
        }

        expect(() => {
            Cli.from([PointCommand])
        }).to.throw(`The arity must be an integer, got 1.5`);
    });

    it(`should throw acceptable errors when tuple length is not positive`, async () => {
        class PointCommand extends Command {
            point = Arguments.String(`--point`, {arity: -1});
            async execute() {}
        }

        expect(() => {
            Cli.from([PointCommand])
        }).to.throw(`The arity must be positive, got -1`);
    });

    it(`should throw acceptable errors when not enough arguments are passed to a tuple`, async () => {
        class PointCommand extends Command {
            point = Arguments.String(`--point`, {arity: 3});
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
            include = Arguments.Array(`--include`, []);
            async execute() {}
        }

        const cli = Cli.from([IncludeCommand]);

        expect(cli.process([])).to.deep.contain({include: []});
        expect(cli.process([`--include`, `foo`])).to.deep.contain({include: [`foo`]});
        expect(cli.process([`--include`, `foo`, `--include`, `bar`])).to.deep.contain({include: [`foo`, `bar`]});
    });

    it(`should extract tuple arrays from complex options`, async () => {
        class IncludeCommand extends Command {
            position = Arguments.Array(`--position`, [], {arity: 3});
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
            thing = Arguments.String({required: false});
            async execute() {}
        }

        const cli = Cli.from([ThingCommand]);

        expect(cli.process([])).to.contain({thing: undefined});
        expect(cli.process([`hello`])).to.contain({thing: `hello`});
    });

    it(`should support optional string positionals after required string positionals`, async () => {
        class CopyCommand extends Command {
            requiredThing = Arguments.String();
            optionalThing = Arguments.String({required: false});
            async execute() {}
        }

        const cli = Cli.from([CopyCommand]);

        expect(cli.process([`hello`])).to.contain({optionalThing: undefined});
        expect(cli.process([`hello`, `world`])).to.contain({optionalThing: `world`});
    });

    it(`should support optional string positionals before required string positionals`, async () => {
        class CopyCommand extends Command {
            optionalThing = Arguments.String({required: false});
            requiredThing = Arguments.String();
            async execute() {}
        }

        const cli = Cli.from([CopyCommand]);

        expect(cli.process([`hello`])).to.contain({optionalThing: undefined, requiredThing: `hello`});
        expect(cli.process([`hello`, `world`])).to.contain({optionalThing: `hello`, requiredThing: `world`});
    });

    it(`should support required positionals after rest arguments`, async () => {
        class CopyCommand extends Command {
            sources = Arguments.Rest();
            destination = Arguments.String();
            async execute() {}
        }

        const cli = Cli.from([CopyCommand]);

        expect(cli.process([`dest`])).to.deep.contain({
            sources: [],
            destination: 'dest',
        });

        expect(cli.process([`src`, `dest`])).to.deep.contain({
            sources: [`src`],
            destination: 'dest',
        });

        expect(cli.process([`src1`, `src2`, `dest`])).to.deep.contain({
            sources: [`src1`, `src2`],
            destination: 'dest',
        });
    });

    it(`should support rest arguments with a minimum required length`, async () => {
        class CopyCommand extends Command {
            sources = Arguments.Rest({required: 1});
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
            sources = Arguments.Rest({required: 1});
            destination = Arguments.String();
            async execute() {}
        }

        const cli = Cli.from([CopyCommand]);

        expect(() => cli.process([])).to.throw();
        expect(() => cli.process([`src`])).to.throw();
        expect(() => cli.process([`dest`])).to.throw();

        expect(cli.process([`src`, `dest`])).to.deep.contain({
            sources: [`src`],
            destination: 'dest',
        });

        expect(cli.process([`src1`, `src2`, `dest`])).to.deep.contain({
            sources: [`src1`, `src2`],
            destination: 'dest',
        });
    });

    // We have this in the README, that's why we're testing it
    it(`should support implementing a cp-like command`, async () => {
        class CopyCommand extends Command {
            sources = Arguments.Rest({required: 1});
            destination = Arguments.String();
            force = Arguments.Boolean(`-f,--force`, false);
            reflink = Arguments.String(`--reflink`, false, {tolerateBoolean: true});
            async execute() {}
        }

        const cli = Cli.from([CopyCommand]);

        expect(cli.process([`src`, `dest`])).to.deep.contain({
            sources: [`src`],
            destination: 'dest',
            force: false,
            reflink: false,
        });

        expect(cli.process([`src1`, `src2`, `dest`])).to.deep.contain({
            sources: [`src1`, `src2`],
            destination: 'dest',
            force: false,
            reflink: false,
        });

        expect(cli.process([`src1`, `--force`, `src2`, `dest`])).to.deep.contain({
            sources: [`src1`, `src2`],
            destination: 'dest',
            force: true,
            reflink: false,
        });

        expect(cli.process([`src1`, `src2`, `--force`, `dest`])).to.deep.contain({
            sources: [`src1`, `src2`],
            destination: 'dest',
            force: true,
            reflink: false,
        });

        expect(cli.process([`src1`, `src2`, `--reflink`, `dest`])).to.deep.contain({
            sources: [`src1`, `src2`],
            destination: 'dest',
            force: false,
            reflink: true,
        });

        expect(cli.process([`src1`, `--reflink=always`, `src2`, `dest`])).to.deep.contain({
            sources: [`src1`, `src2`],
            destination: 'dest',
            force: false,
            reflink: `always`,
        });

        expect(() => cli.process([`dest`])).to.throw();
    });

    it(`should support proxies`, async () => {
        class CopyCommand extends Command {
            args = Arguments.Proxy();
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
            args = Arguments.Proxy({required: 1})
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
            noRedacted = Arguments.Boolean(`--no-redacted`);
            async execute() {}
        }

        const cli = Cli.from([FooCommand]);

        expect(() => cli.process([`--no-redacted`])).not.to.throw();
        expect(() => cli.process([`--redacted`])).to.throw(`Unsupported option name ("--redacted")`);
        expect(() => cli.process([`--no-no-redacted`])).to.throw(`Unsupported option name ("--no-no-redacted")`);
        expect(() => cli.process([`--no-no-no-redacted`])).to.throw(`Unsupported option name ("--no-no-no-redacted")`);
    });
});
