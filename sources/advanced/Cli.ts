import chalk                from 'chalk';
import {Readable, Writable} from 'stream';

import * as core            from '../core';

import {Command}            from './Command';

export interface Context {
    stdin: Readable;
    stdout: Writable;
    stderr: Writable;
}

export class Cli {
    private readonly core: core.Cli<Command> = new core.Cli();

    public readonly name?: string;

    constructor({name}: {name?: string} = {}) {
        this.name = name;
    }

    register(command: typeof Command) {
        this.core.register(command.compile());

        return this;
    }

    start() {
        return this.core.start();
    }

    process(argv: string[]) {
        return this.core.process(argv);
    }

    async run(argv: string[], context?: Partial<Context>): Promise<number> {
        const fullContext = Object.assign({
            stdin: process.stdin,
            stdout: process.stdout,
            stderr: process.stderr,
        }, context);

        const miniApi = {
            process: (argv: string[]) => {
                return this.process(argv);
            },
            run: (argv: string[], subContext?: Partial<Context>) => {
                return this.run(argv, Object.assign({}, fullContext, subContext));
            },
        };

        let command;
        try {
            command = this.core.process(argv);
        } catch (error) {
            if (typeof error.setBinaryName !== `undefined`)
                error.setBinaryName(this.name);
            return this.error(fullContext, error, null);
        }

        if (command.help) {
            fullContext.stdout.write(this.usage(command, true));
            return 0;
        }

        let exitCode;
        try {
            exitCode = await command.execute(miniApi as any, fullContext);
        } catch (error) {
            return this.error(fullContext, error, command);
        }

        if (typeof exitCode === `undefined`)
            exitCode = 0;

        return exitCode;
    }

    async runExit(argv: string[], context?: Partial<Context>) {
        process.exitCode = await this.run(argv, context);
    }

    private usage(command: Command | null, detailed: boolean = false) {
        let result = ``;

        if (command) {
            if (this.name)
                result += `$ ${this.name} ${core.prettyCommand(Command.getMeta(command).definition)}\n`;
            else
                result += `${core.prettyCommand(Command.getMeta(command).definition)}\n`;

            if (detailed) {
                const usage = typeof command.usage !== `undefined`
                    ? command.usage()
                    : ``;

                if (usage) {
                    result += `\n${usage}`;
                }
            }
        }

        return result;
    }

    private error(context: Context, error: Error, command: Command | null) {
        let name = error.name.replace(/([a-z])([A-Z])/g, `$1 $2`);

        if (name === `Error`)
            name = `Internal Error`;

        context.stdout.write(`${chalk.red.bold(name)}: ${error.message}\n`);

        // @ts-ignore
        const meta = error.clipanion as core.ErrorMeta | undefined;

        if (typeof meta !== `undefined`) {
            if (meta.type === `usage`) {
                context.stdout.write(`\n`);
                context.stdout.write(this.usage(command));
            }
        } else {
            if (error.stack) {
                context.stdout.write(`${error.stack.replace(/^.*\n/, ``)}\n`);
            }
        }

        return 1;
    }
}
