import {CommandBuilder, NoLimits, RunState}         from '../core';

import {BaseContext, CliContext, MiniCli} from './Cli';

import type {HelpCommand} from './entries/help';
import type {VersionCommand} from './entries/version';

export type Meta<Context extends BaseContext> = {
    definitions: ((command: CommandBuilder<CliContext<Context>>) => void)[];
    transformers: ((state: RunState, command: Command<Context>, builder: CommandBuilder<CliContext<Context>>) => void)[];
};

/**
 * The usage of a Command.
 */
export type Usage = {
    /**
     * The category of the command.
     *
     * Included in the detailed usage.
     */
    category?: string;

    /**
     * The short description of the command, formatted as Markdown.
     *
     * Included in the detailed usage.
     */
    description?: string;

    /**
     * The extended details of the command, formatted as Markdown.
     *
     * Included in the detailed usage.
     */
    details?: string;

    /**
     * Examples of the command represented as an Array of tuples.
     *
     * The first element of the tuple represents the description of the example.
     *
     * The second element of the tuple represents the command of the example.
     * If present, the leading `$0` is replaced with `cli.binaryName`.
     */
    examples?: [string, string][];
};

/**
 * The definition of a Command.
 */
export type Definition = Usage & {
    /**
     * The path of the command, starting with `cli.binaryName`.
     */
    path: string;

    /**
     * The detailed usage of the command.
     */
    usage: string;
};

/**
 * The schema used to validate the Command instance.
 *
 * The easiest way to validate it is by using the [Yup](https://github.com/jquense/yup) library.
 *
 * @example
 * yup.object().shape({
 *   a: yup.number().integer(),
 *   b: yup.number().integer(),
 * })
 */
export type Schema<C extends Command<any>> = {
    /**
     * A function that takes the `Command` instance as a parameter and validates it, throwing an Error if the validation fails.
     */
    validate: (object: C) => void;
};

export type CommandClass<Context extends BaseContext = BaseContext> = {
    new(): Command<Context>;
    resolveMeta(prototype: Command<Context>): Meta<Context>;
    schema?: Schema<any>;
    usage?: Usage;
};

export abstract class Command<Context extends BaseContext = BaseContext> {
    private static meta?: any;

    public static getMeta<Context extends BaseContext>(prototype: Command<Context>): Meta<Context> {
        const base = prototype.constructor as any;

        return base.meta = Object.prototype.hasOwnProperty.call(base, `meta`) ? base.meta : {
            definitions: [],
            transformers: [
                (state: RunState, command: Command<Context>) => {
                    for (const {name, value} of state.options) {
                        if (name === `-h` || name === `--help`) {
                            // @ts-ignore: The property is meant to have been defined by the child class
                            command.help = value;
                        }
                    }
                },
            ],
        };
    }

    public static resolveMeta<Context extends BaseContext>(prototype: Command<Context>): Meta<Context> {
        const definitions = [];
        const transformers = [];

        for (let proto = prototype; proto instanceof Command; proto = (proto as any).__proto__ as any) {
            const meta = this.getMeta<Context>(proto);

            for (const definition of meta.definitions)
                definitions.push(definition);
            for (const transformer of meta.transformers) {
                transformers.push(transformer);
            }
        }

        return {
            definitions,
            transformers,
        };
    }

    private static registerDefinition<Context extends BaseContext>(prototype: Command<Context>, definition: (command: CommandBuilder<CliContext<Context>>) => void) {
        this.getMeta(prototype).definitions.push(definition);
    }

    private static registerTransformer<Context extends BaseContext>(prototype: Command<Context>, transformer: (state: RunState, command: Command<Context>, builder: CommandBuilder<CliContext<Context>>) => void) {
        this.getMeta(prototype).transformers.push(transformer);
    }

    static addPath(...path: string[]) {
        this.Path(...path)(this.prototype, `execute`);
    }

    static addOption<Context extends BaseContext>(name: string, builder: (prototype: Command<Context>, propertyName: string) => void) {
        builder(this.prototype, name);
    }

    /**
     * Wrap the specified command to be attached to the given path on the command line.
     * The first path thus attached will be considered the "main" one, and all others will be aliases.
     * @param path The command path.
     */
    static Path(...path: string[]) {
        return <Context extends BaseContext>(prototype: Command<Context>, propertyName: string) => {
            this.registerDefinition(prototype, command => {
                command.addPath(path);
            });
        };
    }

    /**
     * Register a boolean listener for the given option names. When Clipanion detects that this argument is present, the value will be set to false. The value won't be set unless the option is found, so you must remember to set it to an appropriate default value.
     * @param descriptor the option names.
     */
    static Boolean(descriptor: string, {hidden = false}: {hidden?: boolean} = {}) {
        return <Context extends BaseContext>(prototype: Command<Context>, propertyName: string) => {
            const optNames = descriptor.split(`,`);

            this.registerDefinition(prototype, command => {
                command.addOption({names: optNames, arity: 0, hidden, allowBinding: false});
            });

            this.registerTransformer(prototype, (state, command) => {
                for (const {name, value} of state.options) {
                    if (optNames.includes(name)) {
                        // @ts-ignore: The property is meant to have been defined by the child class
                        command[propertyName] = value;
                    }
                }
            });
        };
    }

    /**
     * Register a listener that looks for an option and its followup argument. When Clipanion detects that this argument is present, the value will be set to whatever follows the option in the input. The value won't be set unless the option is found, so you must remember to set it to an appropriate default value.
     * Note that all methods affecting positional arguments are evaluated in the definition order; don't mess with it (for example sorting your properties in ascendent order might have adverse results).
     * @param descriptor The option names.
     */
    static String(descriptor: string, opts?: {tolerateBoolean?: boolean, hidden?: boolean}): PropertyDecorator;

    /**
     * Register a listener that looks for positional arguments. When Clipanion detects that an argument isn't an option, it will put it in this property and continue processing the rest of the command line.
     * Note that all methods affecting positional arguments are evaluated in the definition order; don't mess with it (for example sorting your properties in ascendent order might have adverse results).
     * @param descriptor Whether or not filling the positional argument is required for the command to be a valid selection.
     */
    static String(descriptor?: {required?: boolean; name?: string}): PropertyDecorator;

    static String(descriptor: string | {required?: boolean, name?: string} = {}, {tolerateBoolean = false, hidden = false}: {tolerateBoolean?: boolean, hidden?: boolean} = {}) {
        return <Context extends BaseContext>(prototype: Command<Context>, propertyName: string) => {
            if (typeof descriptor === `string`) {
                const optNames = descriptor.split(`,`);

                this.registerDefinition(prototype, command => {
                    // If tolerateBoolean is specified, the command will only accept a string value
                    // using the bind syntax and will otherwise act like a boolean option
                    command.addOption({names: optNames, arity: tolerateBoolean ? 0 : 1, hidden});
                });

                this.registerTransformer(prototype, (state, command) => {
                    for (const {name, value} of state.options) {
                        if (optNames.includes(name)) {
                            // @ts-ignore: The property is meant to have been defined by the child class
                            command[propertyName] = value;
                        }
                    }
                });
            } else {
                const {name = propertyName, required = true} = descriptor;

                this.registerDefinition(prototype, command => {
                    command.addPositional({name, required});
                });

                this.registerTransformer(prototype, (state, command) => {
                    for (let i = 0; i < state.positionals.length; ++i) {
                        // We skip NoLimits extras. We only care about
                        // required and optional finite positionals.
                        if (state.positionals[i].extra === NoLimits)
                            continue;

                        // We skip optional positionals when we only
                        // care about required positionals.
                        if (required && state.positionals[i].extra === true)
                            continue;

                        // We skip required positionals when we only
                        // care about optional positionals.
                        if (!required && state.positionals[i].extra === false)
                            continue;

                        // We remove the positional from the list
                        const [positional] = state.positionals.splice(i, 1);

                        // We assign its value to the property.

                        // @ts-ignore: The property is meant to have been defined by the child class
                        command[propertyName] = positional.value;

                        // We stop after the first successful iteration.
                        break;
                    }
                });
            }
        }
    }


    /**
     * Register a listener that looks for an option and its followup argument. When Clipanion detects that this argument is present, the value will be pushed into the array represented in the property.
     */
    static Array(descriptor: string, {hidden = false}: {hidden?: boolean} = {}) {
        return <Context extends BaseContext>(prototype: Command<Context>, propertyName: string) => {
            const optNames = descriptor.split(`,`);

            this.registerDefinition(prototype, command => {
                command.addOption({names: optNames, arity: 1, hidden});
            });

            this.registerTransformer(prototype, (state, command) => {
                for (const {name, value} of state.options) {
                    if (optNames.includes(name)) {
                        // @ts-ignore: The property is meant to have been defined by the child class
                        command[propertyName] = command[propertyName] || [];
                        // @ts-ignore: The property is meant to have been defined by the child class
                        command[propertyName].push(value);
                    }
                }
            });
        };
    }

    /**
     * Register a listener that takes all the positional arguments remaining and store them into the selected property.
     * Note that all methods affecting positional arguments are evaluated in the definition order; don't mess with it (for example sorting your properties in ascendent order might have adverse results).
     */
    static Rest(): PropertyDecorator;

    /**
     * Register a listener that takes all the positional arguments remaining and store them into the selected property.
     * Note that all methods affecting positional arguments are evaluated in the definition order; don't mess with it (for example sorting your properties in ascendent order might have adverse results).
     * @param opts.required The minimal number of arguments required for the command to be successful.
     */
    static Rest(opts: {required: number}): PropertyDecorator;

    static Rest({required = 0}: {required?: number} = {}) {
        return <Context extends BaseContext>(prototype: Command<Context>, propertyName: string) => {
            this.registerDefinition(prototype, command => {
                command.addRest({name: propertyName, required});
            });

            this.registerTransformer(prototype, (state, command, builder) => {
                // The builder's arity.extra will always be NoLimits,
                // because it is set when we call registerDefinition

                // We can't splice while looping, so we push all indexes
                // of positionals that should be removed into this array
                const positionalsToRemove: number[] = [];

                // We go over each positional
                for (let i = 0; i < state.positionals.length; ++i) {
                    const positional = state.positionals[i];

                    const isNoLimits = positional.extra === NoLimits;
                    const isLeading = positional.extra === false && i < builder.arity.leading.length;

                    // We skip the positional if it isn't either:
                    // 1) a NoLimits extra (i.e. an optional rest argument)
                    // 2) a leading positional (i.e. a required rest argument)
                    if (!isNoLimits && !isLeading)
                        continue;

                        // We mark this positional for removal
                    positionalsToRemove.push(i);

                    // We insert its value at the end of the array property.

                    // @ts-ignore: The property is meant to have been defined by the child class
                    (command[propertyName] ??= []).push(positional.value);
                }

                state.positionals = state.positionals
                    .filter((positional, index) => !positionalsToRemove.includes(index))
            });
        };
    }

    /**
     * Register a listener that takes all the arguments remaining (including options and such) and store them into the selected property.
     * Note that all methods affecting positional arguments are evaluated in the definition order; don't mess with it (for example sorting your properties in ascendent order might have adverse results).
     */
    static Proxy({required = 0}: {required?: number} = {}) {
        return <Context extends BaseContext>(prototype: Command<Context>, propertyName: string) => {
            this.registerDefinition(prototype, command => {
                command.addProxy({required});
            });

            this.registerTransformer(prototype, (state, command) => {
                // No need to filter / splice any positionals for Command.Proxy.
                // Once inside a proxy, we've already reached the point of no return.

                // @ts-ignore: The property is meant to have been defined by the child class
                command[propertyName] = state.positionals.map(({value}) => value);
            });
        };
    }

    /**
     * Defines the usage information for the given command.
     * @param usage
     */
    static Usage(usage: Usage) {
        return usage;
    }

    /**
     * Contains the usage information for the command. If undefined, the command will be hidden from the general listing.
     */
    static usage?: Usage;

    /**
     * Defines the schema for the given command.
     * @param schema
     */
    static Schema<C extends Command<any> = Command<BaseContext>>(schema: Schema<C>) {
        return schema;
    }

    /**
     * The schema used to validate the Command instance.
     */
    static schema?: Schema<any>;

    /**
     * Standard command that'll get executed by `Cli#run` and `Cli#runExit`. Expected to return an exit code or nothing (which Clipanion will treat as if 0 had been returned).
     */
    abstract async execute(): Promise<number | void>;

    /**
     * Standard error handler which will simply rethrow the error. Can be used to add custom logic to handle errors
     * from the command or simply return the parent class error handling.
     * @param error
     */
    async catch(error: any): Promise<void> {
        throw error;
    }

    async validateAndExecute(): Promise<number> {
        const commandClass = this.constructor as CommandClass<Context>;
        const schema = commandClass.schema;

        if (typeof schema !== `undefined`) {
            try {
                await schema.validate(this);
            } catch (error) {
                if (error.name === `ValidationError`)
                    error.clipanion = {type: `usage`};
                throw error;
            }
        }

        const exitCode = await this.execute();
        if (typeof exitCode !== `undefined`) {
            return exitCode;
        } else {
            return 0;
        }
    }

    /**
     * Predefined that will be set to true if `-h,--help` has been used, in which case `Command#execute` shouldn't be called.
     */
    help: boolean = false;

    /**
     * Predefined variable that will be populated with a miniature API that can be used to query Clipanion and forward commands.
     */
    cli!: MiniCli<Context>;

    /**
     * Predefined variable that will be populated with the context of the application.
     */
    context!: Context;

    /**
     * The path that got used to access the command being executed.
     */
    path!: string[];

    /**
     * A list of useful semi-opinionated command entries that have to be registered manually.
     *
     * They cover the basic needs of most CLIs (e.g. help command, version command).
     *
     * @example
     * cli.register(Command.Entries.Help);
     * cli.register(Command.Entries.Version);
     */
    static Entries: {
        /**
         * A command that prints the usage of all commands.
         *
         * Paths: `-h`, `--help`
         */
        Help: typeof HelpCommand;

        /**
         * A command that prints the version of the binary (`cli.binaryVersion`).
         *
         * Paths: `-v`, `--version`
         */
        Version: typeof VersionCommand;
    } = {} as any;
}
