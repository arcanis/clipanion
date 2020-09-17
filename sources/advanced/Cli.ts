import {Readable, Writable}                from 'stream';

import {HELP_COMMAND_INDEX}                from '../constants';
import {CliBuilder}                        from '../core';
import {formatMarkdownish, ColorFormat, richFormat, textFormat}                 from '../format';

import {CommandClass, Command, Definition} from './Command';
import {HelpCommand}                       from './HelpCommand';

/**
 * The base context of the CLI.
 *
 * All Contexts have to extend it.
 */
export type BaseContext = {
    /**
     * The input stream of the CLI.
     *
     * @default
     * process.stdin
     */
    stdin: Readable;

    /**
     * The output stream of the CLI.
     *
     * @default
     * process.stdout
     */
    stdout: Writable;

    /**
     * The error stream of the CLI.
     *
     * @default
     * process.stderr
     */
    stderr: Writable;
};

export type CliContext<Context extends BaseContext> = {
    commandClass: CommandClass<Context>;
};

export type CliOptions = Readonly<{
    /**
     * The label of the binary.
     *
     * Shown at the top of the usage information.
     */
    binaryLabel?: string,

    /**
     * The name of the binary.
     *
     * Included in the path and the examples of the definitions.
     */
    binaryName: string,

    /**
     * The version of the binary.
     *
     * Shown at the top of the usage information.
     */
    binaryVersion?: string,

    /**
     * If `true`, the Cli will use colors in the output.
     *
     * @default
     * process.env.FORCE_COLOR ?? process.stdout.isTTY
     */
    enableColors: boolean,
}>;

export type MiniCli<Context extends BaseContext> = CliOptions & {
    /**
     * Returns an Array representing the definitions of all registered commands.
     */
    definitions(): Definition[];

    /**
     * Formats errors using colors.
     *
     * @param error The error to format. If `error.name` is `'Error'`, it is replaced with `'Internal Error'`.
     * @param opts.command The command whose usage will be included in the formatted error.
     */
    error(error: Error, opts?: {command?: Command<Context> | null}): string;

    /**
     * Compiles a command and its arguments using the `CommandBuilder`.
     *
     * @param input An array containing the name of the command and its arguments
     *
     * @returns The compiled `Command`, with its properties populated with the arguments.
     */
    process(input: string[]): Command<Context>;

    /**
     * Runs a command.
     *
     * @param input An array containing the name of the command and its arguments
     * @param context Overrides the Context of the main `Cli` instance
     *
     * @returns The exit code of the command
     */
    run(input: string[], context?: Partial<Context>): Promise<number>;

    /**
     * Returns the usage of a command.
     *
     * @param command The `Command` whose usage will be returned or `null` to return the usage of all commands.
     * @param opts.detailed If `true`, the usage of a command will also include its description, details, and examples. Doesn't have any effect if `command` is `null` or doesn't have a `usage` property.
     * @param opts.prefix The prefix displayed before each command. Defaults to `$`.
     */
    usage(command?: CommandClass<Context> | Command<Context> | null, opts?: {detailed?: boolean, prefix?: string}): string;
};

function getDefaultColorSettings() {
    if (process.env.FORCE_COLOR === `0`)
        return false;
    if (process.env.FORCE_COLOR === `1`)
        return true;

    if (typeof process.stdout !== `undefined` && process.stdout.isTTY)
        return true;

    return false;
}

/**
 * @template Context The context shared by all commands. Contexts are a set of values, defined when calling the `run`/`runExit` functions from the CLI instance, that will be made available to the commands via `this.context`.
 */
export class Cli<Context extends BaseContext = BaseContext> implements MiniCli<Context> {
    /**
     * The default context of the CLI.
     *
     * Contains the stdio of the current `process`.
     */
    static defaultContext = {
        stdin: process.stdin,
        stdout: process.stdout,
        stderr: process.stderr,
    };

    private readonly builder: CliBuilder<CliContext<Context>>;

    private readonly registrations: Map<CommandClass<Context>, number> = new Map();

    public readonly binaryLabel?: string;
    public readonly binaryName: string;
    public readonly binaryVersion?: string;

    public readonly enableColors: boolean;

    /**
     * Creates a new Cli and registers all commands passed as parameters.
     *
     * @param commandClasses The Commands to register
     * @returns The created `Cli` instance
     */
    static from<Context extends BaseContext = BaseContext>(commandClasses: CommandClass<Context>[], options: Partial<CliOptions> = {}) {
        const cli = new Cli<Context>(options);

        for (const commandClass of commandClasses)
            cli.register(commandClass);

        return cli;
    }

    constructor({binaryLabel, binaryName: binaryNameOpt = `...`, binaryVersion, enableColors = getDefaultColorSettings()}: Partial<CliOptions> = {}) {
        this.builder = new CliBuilder({binaryName: binaryNameOpt});

        this.binaryLabel = binaryLabel;
        this.binaryName = binaryNameOpt;
        this.binaryVersion = binaryVersion;

        this.enableColors = enableColors;
    }

    /**
     * Registers a command inside the CLI.
     */
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
                return HelpCommand.from<Context>(state, contexts);
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
        let command: Command<Context>;

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
            binaryLabel: this.binaryLabel,
            binaryName: this.binaryName,
            binaryVersion: this.binaryVersion,
            enableColors: this.enableColors,
            definitions: () => this.definitions(),
            error: (error, opts) => this.error(error, opts),
            process: input => this.process(input),
            run: (input, subContext?) => this.run(input, {...context, ...subContext}),
            usage: (command, opts) => this.usage(command, opts),
        };

        let exitCode;
        try {
            exitCode = await command.validateAndExecute().catch(error => command.catch(error).then(() => 0));
        } catch (error) {
            context.stdout.write(this.error(error, {command}));
            return 1;
        }

        return exitCode;
    }

    /**
     * Runs a command and exits the current `process` with the exit code returned by the command.
     *
     * @param input An array containing the name of the command and its arguments.
     *
     * @example
     * cli.runExit(process.argv.slice(2), Cli.defaultContext)
     */
    async runExit(input: Command<Context> | string[], context: Context) {
        process.exitCode = await this.run(input, context);
    }

    suggest(input: string[], partial: boolean) {
        const {contexts, process, suggest} = this.builder.compile();
        return suggest(input, partial);
    }

    definitions({colored = false}: {colored?: boolean} = {}): Definition[] {
        const data: Definition[] = [];

        for (const [commandClass, number] of this.registrations) {
            if (typeof commandClass.usage === `undefined`)
                continue;

            const builder = this.builder.getBuilderByIndex(number);
            const path = this.getUsageByIndex(number, {detailed: false});
            const usage = this.getUsageByIndex(number, {detailed: true});

            const category = typeof commandClass.usage.category !== `undefined`
                ? formatMarkdownish(commandClass.usage.category, {format: this.format(colored), paragraphs: false})
                : undefined;

            const description = typeof commandClass.usage.description !== `undefined`
                ? formatMarkdownish(commandClass.usage.description, {format: this.format(colored), paragraphs: false})
                : undefined;

            const details = typeof commandClass.usage.details !== `undefined`
                ? formatMarkdownish(commandClass.usage.details, {format: this.format(colored), paragraphs: true})
                : undefined;

            const examples: Definition['examples'] = typeof commandClass.usage.examples !== `undefined`
                ? commandClass.usage.examples.map(([label, cli]) => [formatMarkdownish(label, {format: this.format(colored), paragraphs: false}), cli.replace(/\$0/g, this.binaryName)])
                : undefined;

            const options = builder.getOptions().map(({names, description}) => ({definition: names.join(','), description}));

            data.push({path, usage, category, description, details, examples, options});
        }

        return data;
    }

    usage(command: CommandClass<Context> | Command<Context> | null = null, {colored, detailed = false, prefix = `$ `}: {colored?: boolean, detailed?: boolean, prefix?: string} = {}) {
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
                    ? formatMarkdownish(commandClass.usage.category, {format: this.format(colored), paragraphs: false})
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
                    result += `${this.format(colored).bold(`${this.binaryLabel} - ${this.binaryVersion}`)}\n\n`;
                else if (hasLabel)
                    result += `${this.format(colored).bold(`${this.binaryLabel}`)}\n`;
                else
                    result += `${this.format(colored).bold(`${this.binaryVersion}`)}\n`;

                result += `  ${this.format(colored).bold(prefix)}${this.binaryName} <command>\n`;
            } else {
                result += `${this.format(colored).bold(prefix)}${this.binaryName} <command>\n`;
            }

            for (let categoryName of categoryNames) {
                const commands = commandsByCategories.get(categoryName)!.slice().sort((a, b) => {
                    return a.usage.localeCompare(b.usage, `en`, {usage: `sort`, caseFirst: `upper`});
                });

                const header = categoryName !== null
                    ? categoryName.trim()
                    : `Where <command> is one of`;

                result += `\n`;
                result += `${this.format(colored).bold(`${header}:`)}\n`;

                for (let {commandClass, usage} of commands) {
                    const doc = commandClass.usage!.description || `undocumented`;

                    result += `\n`;
                    result += `  ${this.format(colored).bold(usage)}\n`;
                    result += `    ${formatMarkdownish(doc, {format: this.format(colored), paragraphs: false})}`;
                }
            }

            result += `\n`;
            result += formatMarkdownish(`You can also print more details about any of these commands by calling them after adding the \`-h,--help\` flag right after the command name.`, {format: this.format(colored), paragraphs: true});
        } else {
            if (!detailed) {
                result += `${this.format(colored).bold(prefix)}${this.getUsageByRegistration(commandClass)}\n`;
            } else {
                const {
                    description = ``,
                    details = ``,
                    examples = [],
                } = commandClass.usage || {};

                if (description !== ``) {
                    result += formatMarkdownish(description, {format: this.format(colored), paragraphs: false}).replace(/^./, $0 => $0.toUpperCase());
                    result += `\n`;
                }

                if (details !== `` || examples.length > 0) {
                    result += `${this.format(colored).bold(`Usage:`)}\n`
                    result += `\n`;
                }

                result += `${this.format(colored).bold(prefix)}${this.getUsageByRegistration(commandClass, {showOptionList: true})}\n`;

                if (details !== ``) {
                    result += `\n`;
                    result += `${this.format(colored).bold(`Details:`)}\n`;
                    result += `\n`;

                    result += formatMarkdownish(details, {format: this.format(colored), paragraphs: true});
                }

                if (examples.length > 0) {
                    result += `\n`;
                    result += `${this.format(colored).bold(`Examples:`)}\n`;

                    for (let [description, example] of examples) {
                        result += `\n`;
                        result += formatMarkdownish(description, {format: this.format(colored), paragraphs: false});
                        result += example
                            .replace(/^/m, `  ${this.format(colored).bold(prefix)}`)
                            .replace(/\$0/g, this.binaryName)
                         + `\n`;
                    }
                }
            }
        }

        return result;
    }

    error(error: Error | any, {colored, command = null}: {colored?: boolean, command?: Command<Context> | null} = {}) {
        if (!(error instanceof Error))
            error = new Error(`Execution failed with a non-error rejection (rejected value: ${JSON.stringify(error)})`);

        let result = ``;

        let name = error.name.replace(/([a-z])([A-Z])/g, `$1 $2`);
        if (name === `Error`)
            name = `Internal Error`;

        result += `${this.format(colored).error(name)}: ${error.message}\n`;

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

    private getUsageByRegistration(klass: CommandClass<Context>, opts?: {detailed?: boolean; showOptionList?: boolean}) {
        const index = this.registrations.get(klass);
        if (typeof index === `undefined`)
            throw new Error(`Assertion failed: Unregistered command`);

        return this.getUsageByIndex(index, opts);
    }

    private getUsageByIndex(n: number, opts?: {detailed?: boolean; showOptionList?: boolean}) {
        return this.builder.getBuilderByIndex(n).usage(opts);
    }

    private format(colored: boolean = this.enableColors): ColorFormat {
        return colored ? richFormat : textFormat;
    }
}
