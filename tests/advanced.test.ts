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

    it.only(`should support inheritance`, async () => {
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

    it.only(`derives positional argument names from the fiel name`, async () => {
        class CommandA extends Command {
            @Command.String()
            workspaceName!: string;

            @Command.Path(`workspace`)
            async execute() {
                log(this, [`workspaceName`]);
            }
        }

        const cli = Cli.from([CommandA])

        expect(cli.usage(CommandA)).to.equal(`\u001b[1m$ \u001b[22m... workspace <arg>\n`);
    });
});
