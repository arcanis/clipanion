import chaiAsPromised               from 'chai-as-promised';
import chai, {expect}               from 'chai';
import getStream                    from 'get-stream';
import {PassThrough}                from 'stream';

import {Cli, CommandClass, Command} from '../sources/advanced';

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
            it(`should display the usage`, async () => {
                const cli = new Cli()
                cli.register(Command.Entries.Help);

                expect(await runCli(cli, [`-h`])).to.equal(cli.usage(null));
                expect(await runCli(cli, [`--help`])).to.equal(cli.usage(null));
            })
        });

        describe(`version`, () => {
            it(`should display the version of the binary`, async () => {
                const cli = new Cli({binaryVersion: `2.3.4`})
                cli.register(Command.Entries.Version);

                expect(await runCli(cli, [`-v`])).to.equal(`2.3.4\n`);
                expect(await runCli(cli, [`--version`])).to.equal(`2.3.4\n`);

            });

            it(`should display "<unknown>" when no version is specified`, async () => {
                const cli = new Cli()
                cli.register(Command.Entries.Version);

                expect(await runCli(cli, [`-v`])).to.equal(`<unknown>\n`);
                expect(await runCli(cli, [`--version`])).to.equal(`<unknown>\n`);

            });
        });
    });

    it(`should print the general help listing when using --help on the raw command`, async () => {
        const output = await runCli(() => {
            class CommandHelp extends Command {
                @Command.Path(`--help`)
                @Command.Path(`-h`)
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
                @Command.Boolean(`--foo`)
                foo: boolean = false;

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
                @Command.String()
                arg!: string;

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
                @Command.Proxy()
                args: string[] = [];

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
                @Command.Path(`add`)

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

    it(`should expose binary information on the MiniCli`, async () => {
        const binaryInfo = {
            binaryLabel: `My CLI`,
            binaryName: `my-cli`,
            binaryVersion: `1.0.0`,
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
                @Command.Path(`foo`)
                async execute() {
                    log(this);
                    this.cli.run([`bar`]);
                }
            }
            class CommandB extends Command {
                @Command.Path(`bar`)
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
                @Command.String(`--foo`)
                foo!: string;

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
            @Command.String()
            workspaceName!: string;

            @Command.String({required: false})
            extra!: string;

            @Command.String()
            scriptName!: string;

            @Command.Path(`workspace`)
            async execute() {
                throw new Error('not implemented, just testing usage()')
            }
        }

        const cli = Cli.from([CommandA])

        expect(cli.usage(CommandA)).to.equal(`\u001b[1m$ \u001b[22m... workspace <workspaceName> [extra] <scriptName>\n`);
    });

    it(`derives rest argument names from the property name`, async () => {
        class CommandA extends Command {
            @Command.Rest({required: 2})
            workspaceNames!: string;

            @Command.Path(`clean`)
            async execute() {
                throw new Error('not implemented, just testing usage()')
            }
        }

        const cli = Cli.from([CommandA])

        expect(cli.usage(CommandA)).to.equal(`\u001b[1m$ \u001b[22m... clean <workspaceNames> <workspaceNames> ...\n`);
    });

    it(`supports strings that act like booleans if not bound to a value`, async () => {
        class CommandA extends Command {
            @Command.String(`--break`, { tolerateBoolean: true })
            enableDebugger: boolean | string = false;

            async execute() {
                log(this, [`enableDebugger`]);
            }
        }

        class InvertedCommandA extends Command {
            @Command.String(`--break`, { tolerateBoolean: true })
            enableDebugger: boolean | string = true;

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
});
