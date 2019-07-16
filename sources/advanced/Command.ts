import * as core                      from '../core';

import {Cli, DefaultContext, MiniCli} from './Cli';

export type Help = {
    description: string;
    details: string;
    examples: {description: string, command: string}[];
};

export type Meta = {
    definition: core.Definition;
    transformers: ((command: any, parsed: core.Parsed) => void)[];
};

export abstract class Command<Context extends DefaultContext = DefaultContext> {
    static meta: Meta | undefined;

    static getMeta<Context extends DefaultContext>(from?: Command<Context>): Meta {
        if (typeof from !== `undefined`)
            return (from.constructor as typeof Command).getMeta();

        return this.meta = this.meta || {
            definition: {
                path: [],
                options: {
                    simple: new Set(),
                    complex: new Set(),
                },
                positionals: {
                    minimum: 0,
                    maximum: 0,
                    proxy: false,
                },
            },
            transformers: [
                (command, parsed) => {
                    for (const {name, value} of parsed.options) {
                        if (name === `-h` || name === `--help`) {
                            command.help = value;
                        }
                    }
                },
            ],
        };
    }

    static Validate(schema: any) {
        return (klass: any) => {
            const parent = klass.prototype.execute;

            klass.prototype.execute = async function execute(cli: Cli) {
                try {
                    await schema.validate(this);
                } catch (error) {
                    if (error.name === `ValidationError`)
                        error.clipanion = {type: `usage`};
                    throw error;
                }

                // @ts-ignore
                return parent.call(this, cli);
            };
        };
    }

    static Array(descriptor: string) {
        const optionNames = new Set(descriptor.split(/,/g));

        return <Context extends DefaultContext>(prototype: Command<Context>, propertyName: string) => {
            const {definition, transformers} = (prototype.constructor as typeof Command).getMeta();
  
            for (const optionName of optionNames)
                definition.options.complex.add(optionName);

            transformers.push((command, parsed) => {
                for (const {name, value} of parsed.options) {
                    if (optionNames.has(name) && typeof value !== `undefined`) {
                        command[propertyName] = command[propertyName] || [];
                        command[propertyName].push(value);
                    }
                }
            });
        };
    }

    static Rest(): PropertyDecorator;
    static Rest(opts: {required: number}): PropertyDecorator;
    static Rest({required = 0}: {required?: number} = {}) {
        return <Context extends DefaultContext>(prototype: Command<Context>, propertyName: string) => {
            const {definition, transformers} = (prototype.constructor as typeof Command).getMeta();

            const index = definition.positionals.maximum;
            definition.positionals.minimum += required;
            definition.positionals.maximum = Infinity;

            transformers.push((command, parsed) => {
                command[propertyName] = parsed.positionals.slice(index);
            });
        };
    }

    static Proxy() {
        return <Context extends DefaultContext>(prototype: Command<Context>, propertyName: string) => {
            const {definition, transformers} = (prototype.constructor as typeof Command).getMeta();

            const index = definition.positionals.maximum;
            definition.positionals.maximum = Infinity;
            definition.positionals.proxy = true;

            transformers.push((command, parsed) => {
                command[propertyName] = parsed.positionals.slice(index);
            });
        };
    }

    static Boolean(descriptor: string) {
        const optionNames = new Set(descriptor.split(/,/g));
        const reversedNames = new Set<string>();

        for (const optionName of descriptor)
            if (optionName.startsWith(`--`) && !optionName.startsWith(`--no-`))
                reversedNames.add(optionName);

        return <Context extends DefaultContext>(prototype: Command<Context>, propertyName: string) => {
            const {definition, transformers} = (prototype.constructor as typeof Command).getMeta();

            for (const optionName of optionNames)
                definition.options.simple.add(optionName);

            for (const reversedName of reversedNames)
                definition.options.simple.add(reversedName);

            transformers.push((command, parsed) => {
                for (const {name, value} of parsed.options) {
                    if (optionNames.has(name) && typeof value !== `undefined`)
                        command[propertyName] = value;
                    if (reversedNames.has(name) && typeof value !== `undefined`) {
                        command[propertyName] = !value;
                    }
                }
            });
        };
    }

    static String(): PropertyDecorator;
    static String(opts: {required: boolean}): PropertyDecorator;
    static String(descriptor: string): PropertyDecorator;
    static String(descriptor: string | {required: boolean} = {required: true}) {
        return <Context extends DefaultContext>(prototype: Command<Context>, propertyName: string) => {
            const {definition, transformers} = (prototype.constructor as typeof Command).getMeta();

            if (typeof descriptor === `string`) {
                const optionNames = new Set(descriptor.split(/,/));

                for (const optionName of optionNames)
                    definition.options.complex.add(optionName);

                transformers.push((command, parsed) => {
                    for (const {name, value} of parsed.options) {
                        if (optionNames.has(name) && typeof value !== `undefined`) {
                            command[propertyName] = value;
                        }
                    }
                });
            } else {
                const index = definition.positionals.maximum;

                definition.positionals.maximum += 1;

                if (descriptor.required)
                    definition.positionals.minimum += 1;

                transformers.push((command, parsed) => {
                    const value = parsed.positionals[index];

                    if (typeof value !== `undefined`) {
                        command[propertyName] = value;
                    }
                });
            }
        };
    }

    static Path(... segments: string[]) {
        return <Context extends DefaultContext>(prototype: Command<Context>, propertyName: `execute`) => {
            const {definition} = (prototype.constructor as typeof Command).getMeta();
            
            definition.path = segments;
        };
    }

    static Usage({description, details}: Partial<Help> = {}) {
        return () => {
            let result = ``;

            if (typeof details !== `undefined`) {
                if (result !== ``)
                    result += `\n`;
                result += core.prettyMarkdownish(details, true);
            } else if (typeof description !== `undefined`) {
                if (result !== ``)
                    result += `\n`;
                result += core.prettyMarkdownish(description, false);
            }
            
            return result;
        };
    }

    static compile<Context extends DefaultContext>() {
        const {definition, transformers} = (this as typeof Command).getMeta();

        return new core.Command<(cli: Cli<Context>, context: Context) => Command<Context>>(definition, parsed => (cli, context) => {
            // @ts-ignore: In practice, "this" will be the subclass that
            // inherit from Command (and thus not an abstract)
            const bag = new this();

            bag.cli = cli;
            bag.context = context;

            for (const transformer of transformers)
                transformer(bag, parsed);

            return bag;
        });
    }

    // Those two fields are automatically populated
    public cli!: MiniCli<Context>;
    public context!: Context;

    // This option is automatically added (it needs an extra logic to support
    // ignoring the overall syntax of the command)
    public help: boolean = false;

    /**
     * If defined, must contain a function that returns the string displayed
     * when the command help message is generated.
     */
    public usage: (() => string) | undefined;

    /**
     * Executed by Cli#run and Cli#runExit.
     */

    abstract execute(): Promise<number | void>;
}
