import chalk                from 'chalk';
import {Readable, Writable} from 'stream';

import * as core            from '../core';

import {Command}            from './Command';

export interface DefaultContext {
    stdin: Readable;
    stdout: Writable;
    stderr: Writable;
}

interface CommandFactory<Context extends DefaultContext> {
    new(): Command<Context>;
    compile(): core.Command<(cli: Cli<Context>, context: Context) => Command<Context>>;
}

export interface MiniCli<Context extends DefaultContext> {
    process(argv: string[]): Command<Context>;
    run(argv: string[], subContext?: Partial<Context>): Promise<number | void>;
}

export class Cli<Context extends DefaultContext = DefaultContext> {
    private readonly core: core.Cli<(cli: Cli<Context>, context: Context) => Command<Context>> = new core.Cli();

    public readonly name?: string;

    constructor({name}: {name?: string} = {}) {
        this.name = name;
    }

    register(command: CommandFactory<Context>) {
        this.core.register(command.compile());

        return this;
    }

    start() {
        return this.core.start();
    }

    process(argv: string[]) {
        return this.core.process(argv);
    }

    async run(argv: string[], context: Context): Promise<number> {
        const miniCli: MiniCli<Context> = {
            process: (argv: string[]) => {
                return this.process(argv)(this, context);
            },
            run: (argv: string[], subContext?: Partial<Context>) => {
                return this.run(argv, Object.assign({}, context, subContext));
            },
        };
        
        let command: Command<Context>;
        try {
            command = this.core.process(argv)(miniCli as any, context);
        } catch (error) {
            if (typeof error.setBinaryName !== `undefined`)
                error.setBinaryName(this.name);
            return this.error(context, error, null);
        }

        if (command.help) {
            context.stdout.write(this.usage(command, true));
            return 0;
        }

        let exitCode;
        try {
            exitCode = await command.execute();
        } catch (error) {
            return this.error(context, error, command);
        }

        if (typeof exitCode === `undefined`)
            exitCode = 0;

        return exitCode;
    }

    async runExit(argv: string[], context: Context) {
        process.exitCode = await this.run(argv, context);
    }

    private usage(command: Command<Context> | null, detailed: boolean = false) {
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

    private error(context: Context, error: Error, command: Command<Context> | null) {
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
