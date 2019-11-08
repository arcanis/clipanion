import chalk                   from 'chalk';
import {Readable, Writable}    from 'stream';

import {HELP_COMMAND_INDEX}    from '../core';
import {CliBuilder}            from '../core';
import {formatMarkdownish}     from '../format';

import {CommandClass, Command} from './Command';
import {HelpCommand}           from './HelpCommand';

export type BaseContext = {
    stdin: Readable;
    stdout: Writable;
    stderr: Writable;
};

export type CliContext<Context extends BaseContext> = {
    commandClass: CommandClass<Context>;
};

export type MiniCli<Context extends BaseContext> = {
    definitions(): Object;
    error(error: Error, opts?: {command?: Command<Context> | null}): string;
    process(input: string[]): Command<Context>;
    run(input: string[], context?: Partial<Context>): Promise<number>;
    usage(command?: CommandClass<Context> | Command<Context> | null, opts?: {detailed?: boolean, prefix?: string}): string;
};

export class Cli<Context extends BaseContext = BaseContext> implements MiniCli<Context> {
    private readonly builder: CliBuilder<CliContext<Context>>;

    private readonly registrations: Map<CommandClass<Context>, number> = new Map();

    public readonly binaryLabel?: string;
    public readonly binaryName: string;
    public readonly binaryVersion?: string;

    static from<Context extends BaseContext = BaseContext>(commandClasses: CommandClass<Context>[]) {
        const cli = new Cli<Context>();

        for (const commandClass of commandClasses)
            cli.register(commandClass);

        return cli;
    }

    constructor({binaryLabel, binaryName = `...`, binaryVersion}: {binaryLabel?: string, binaryName?: string, binaryVersion?: string} = {}) {
        this.builder = new CliBuilder({binaryName});

        this.binaryLabel = binaryLabel;
        this.binaryName = binaryName;
        this.binaryVersion = binaryVersion;
    }

    register(commandClass: CommandClass<Context>) {
        const commandBuilder = this.builder.command();
        this.registrations.set(commandClass, commandBuilder.cliIndex);

        const {definitions} = commandClass.resolveMeta(commandClass.prototype);
        for (const definition of definitions)
            definition(commandBuilder);

        commandBuilder.setContext({
            commandClass,
        });
    }

    process(input: string[]) {
        const {contexts, process} = this.builder.compile();
        const state = process(input);

        switch (state.selectedIndex) {
            case HELP_COMMAND_INDEX: {
                return HelpCommand.from<Context>(state, this, contexts);
            } break;

            default: {
                const {commandClass} = contexts[state.selectedIndex!];

                const command = new commandClass();
                command.path = state.path;

                const {transformers} = commandClass.resolveMeta(commandClass.prototype);
                for (const transformer of transformers)
                    transformer(state, command);

                return command;
            } break;
        }
    }

    async run(input: Command<Context> | string[], context: Context) {
        let command;

        if (!Array.isArray(input)) {
            command = input;
        } else {
            try {
                command = this.process(input);
            } catch (error) {
                context.stdout.write(this.error(error));
                return 1;
            }
        }

        if (command.help) {
            context.stdout.write(this.usage(command, {detailed: true}));
            return 0;
        }

        command.context = context;
        command.cli = {
            definitions: () => this.definitions(),
            error: (error, opts) => this.error(error, opts),
            process: input => this.process(input),
            run: (input, subContext?) => this.run(input, {...context, ...subContext}),
            usage: (command, opts) => this.usage(command, opts),
        };

        let exitCode;
        try {
            exitCode = await command.validateAndExecute();
        } catch (error) {
            context.stdout.write(this.error(error, {command}));
            return 1;
        }

        return exitCode;
    }

    async runExit(input: Command<Context> | string[], context: Context) {
        process.exitCode = await this.run(input, context);
    }

    async suggestFor(input: string[]) {
        const {contexts, process, suggest} = this.builder.compile();
        return suggest(input);
    }

    definitions() {
        const data = [];

        for (const [commandClass, number] of this.registrations) {
            if (typeof commandClass.usage === `undefined`)
                continue;

            const path = this.getUsageByIndex(number, {detailed: false});
            const usage = this.getUsageByIndex(number, {detailed: true});

            const category = typeof commandClass.usage.category !== `undefined`
                ? formatMarkdownish(commandClass.usage.category, false)
                : undefined;

            const description = typeof commandClass.usage.description !== `undefined`
                ? formatMarkdownish(commandClass.usage.description, false)
                : undefined;

            const details = typeof commandClass.usage.details !== `undefined`
                ? formatMarkdownish(commandClass.usage.details, true)
                : undefined;

            const examples = typeof commandClass.usage.examples !== `undefined`
                ? commandClass.usage.examples.map(([label, cli]) => [formatMarkdownish(label, false), cli.replace(/\$0/g, this.binaryName)])
                : undefined;

            data.push({path, usage, category, description, details, examples});
        }

        return data;
    }

    usage(command: CommandClass<Context> | Command<Context> | null = null, {detailed = false, prefix = `$ `}: {detailed?: boolean, prefix?: string} = {}) {
        // @ts-ignore
        const commandClass = command !== null && typeof command.getMeta === `undefined`
            ? command.constructor as CommandClass<Context>
            : command as CommandClass<Context> | null;

        let result = ``;

        if (!commandClass) {
            const commandsByCategories = new Map<string | null, {
                commandClass: CommandClass<Context>;
                usage: string;
            }[]>();

            for (const [commandClass, number] of this.registrations.entries()) {
                if (typeof commandClass.usage === `undefined`)
                    continue;

                const category = typeof commandClass.usage.category !== `undefined`
                    ? formatMarkdownish(commandClass.usage.category, false)
                    : null;

                let categoryCommands = commandsByCategories.get(category);
                if (typeof categoryCommands === `undefined`)
                    commandsByCategories.set(category, categoryCommands = []);

                const usage = this.getUsageByIndex(number);
                categoryCommands.push({commandClass, usage});
            }

            const categoryNames = Array.from(commandsByCategories.keys()).sort((a, b) => {
                if (a === null) return -1;
                if (b === null) return +1;
                return a.localeCompare(b, `en`, {usage: `sort`, caseFirst: `upper`});
            });

            const hasLabel = typeof this.binaryLabel !== `undefined`;
            const hasVersion = typeof this.binaryVersion !== `undefined`;

            if (hasLabel || hasVersion) {
                if (hasLabel && hasVersion)
                    result += `${chalk.bold(`${this.binaryLabel} - ${this.binaryVersion}`)}\n\n`;
                else if (hasLabel)
                    result += `${chalk.bold(`${this.binaryLabel}`)}\n`;
                else
                    result += `${chalk.bold(`${this.binaryVersion}`)}\n`;

                result += `  ${chalk.bold(prefix)}${this.binaryName} <command>\n`;
            } else {
                result += `${chalk.bold(prefix)}${this.binaryName} <command>\n`;
            }

            for (let categoryName of categoryNames) {
                const commands = commandsByCategories.get(categoryName)!.slice().sort((a, b) => {
                    return a.usage.localeCompare(b.usage, `en`, {usage: `sort`, caseFirst: `upper`});
                });

                const header = categoryName !== null
                    ? categoryName.trim()
                    : `Where <command> is one of`;

                result += `\n`;
                result += `${chalk.bold(`${header}:`)}\n`;

                for (let {commandClass, usage} of commands) {
                    const doc = commandClass.usage!.description || `undocumented`;

                    result += `\n`;
                    result += `  ${chalk.bold(usage)}\n`;
                    result += `    ${formatMarkdownish(doc, false)}`;
                }
            }

            result += `\n`;
            result += formatMarkdownish(`You can also print more details about any of these commands by calling them after adding the \`-h,--help\` flag right after the command name.`, true);
        } else {
            if (!detailed) {
                result += `${chalk.bold(prefix)}${this.getUsageByRegistration(commandClass)}\n`;
            } else {
                const {
                    description = ``,
                    details = ``,
                    examples = [],
                } = commandClass.usage || {};

                if (description !== ``) {
                    result += formatMarkdownish(description, false).replace(/^./, $0 => $0.toUpperCase());
                    result += `\n`;
                }

                if (details !== `` || examples.length > 0) {
                    result += `${chalk.bold(`Usage:`)}\n`
                    result += `\n`;
                }

                result += `${chalk.bold(prefix)}${this.getUsageByRegistration(commandClass)}\n`;

                if (details !== ``) {
                    result += `\n`;
                    result += `${chalk.bold(`Details:`)}\n`;
                    result += `\n`;

                    result += formatMarkdownish(details, true);
                }

                if (examples.length > 0) {
                    result += `\n`;
                    result += `${chalk.bold(`Examples:`)}\n`;

                    for (let [description, example] of examples) {
                        result += `\n`;
                        result += formatMarkdownish(description, false);
                        result += example
                            .replace(/^/m, `  ${chalk.bold(prefix)}`)
                            .replace(/\$0/g, this.binaryName)
                         + `\n`;
                    }
                }
            }
        }

        return result;
    }

    error(error: Error, {command = null}: {command?: Command<Context> | null} = {}) {
        let result = ``;

        let name = error.name.replace(/([a-z])([A-Z])/g, `$1 $2`);
        if (name === `Error`)
            name = `Internal Error`;

        result += `${chalk.red.bold(name)}: ${error.message}\n`;

        // @ts-ignore
        const meta = error.clipanion as core.ErrorMeta | undefined;

        if (typeof meta !== `undefined`) {
            if (meta.type === `usage`) {
                result += `\n`;
                result += this.usage(command);
            }
        } else {
            if (error.stack) {
                result += `${error.stack.replace(/^.*\n/, ``)}\n`;
            }
        }

        return result;
    }

    private getUsageByRegistration(klass: CommandClass<Context>, opts?: {detailed: boolean}) {
        const index = this.registrations.get(klass);
        if (typeof index === `undefined`)
            throw new Error(`Assertion failed: Unregistered command`);

        return this.getUsageByIndex(index, opts);
    }

    private getUsageByIndex(n: number, opts?: {detailed: boolean}) {
        return this.builder.getBuilderByIndex(n).usage(opts);
    }
}
