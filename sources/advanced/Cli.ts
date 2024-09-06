import * as platform                                            from 'clipanion/platform';
import {Readable, Writable}                                     from 'stream';

import {HELP_COMMAND_INDEX}                                     from '../constants';
import {CliBuilder, CommandBuilder}                             from '../core';
import {ErrorMeta}                                              from '../errors';
import {formatMarkdownish, ColorFormat, richFormat, textFormat} from '../format';

import {CommandClass, Command, Definition}                      from './Command';
import {HelpCommand}                                            from './HelpCommand';
import {CommandOption}                                          from './options/utils';

const errorCommandSymbol = Symbol(`clipanion/errorCommand`);

type MakeOptional<T, Keys extends keyof T> = Omit<T, Keys> & Partial<Pick<T, Keys>>;
type VoidIfEmpty<T> = keyof T extends never ? void : never;

/**
 * The base context of the CLI.
 *
 * All Contexts have to extend it.
 */
export type BaseContext = {
  /**
   * Environment variables.
   *
   * @default
   * process.env
   */
  env: Record<string, string | undefined>;

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

  /**
   * Whether colors should be enabled.
   */
  colorDepth: number;
};

export type CliContext<Context extends BaseContext> = {
  commandClass: CommandClass<Context>;
};

export type UserContextKeys<Context extends BaseContext> = Exclude<keyof Context, keyof BaseContext>;
export type UserContext<Context extends BaseContext> = Pick<Context, UserContextKeys<Context>>;

export type PartialContext<Context extends BaseContext> = UserContextKeys<Context> extends never
  ? Partial<Pick<Context, keyof BaseContext>> | undefined | void
  : Partial<Pick<Context, keyof BaseContext>> & UserContext<Context>;

export type RunContext<Context extends BaseContext = BaseContext> =
  & Partial<Pick<Context, keyof BaseContext>>
  & UserContext<Context>;

export type RunCommand<Context extends BaseContext = BaseContext> =
  | Array<CommandClass<Context>>
  | CommandClass<Context>;

export type RunCommandNoContext<Context extends BaseContext = BaseContext> =
  UserContextKeys<Context> extends never
    ? RunCommand<Context>
    : never;

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
   * If `true`, the Cli will hook into the process standard streams to catch
   * the output produced by console.log and redirect them into the context
   * streams. Note: stdin isn't captured at the moment.
   *
   * @default
   * false
   */
  enableCapture: boolean,

  /**
   * If `true`, the Cli will use colors in the output. If `false`, it won't.
   * If `undefined`, Clipanion will infer the correct value from the env.
   */
  enableColors?: boolean,
}>;

export type MiniCli<Context extends BaseContext> = CliOptions & {
  /**
   * Returns an Array representing the definitions of all registered commands.
   */
  definitions(): Array<Definition>;

  /**
   * Get the definition of a particular command.
   */
  definition(command: CommandClass<Context>): Definition | null;

  /**
   * Formats errors using colors.
   *
   * @param error The error to format. If `error.name` is `'Error'`, it is replaced with `'Internal Error'`.
   * @param opts.command The command whose usage will be included in the formatted error.
   */
  error(error: Error, opts?: {command?: Command<Context> | null}): string;

  /**
   * Returns a rich color format if colors are enabled, or a plain text format otherwise.
   *
   * @param colored Forcefully enable or disable colors.
   */
  format(colored?: boolean): ColorFormat;

  /**
   * Compiles a command and its arguments using the `CommandBuilder`.
   *
   * @param input An array containing the name of the command and its arguments
   *
   * @returns The compiled `Command`, with its properties populated with the arguments.
   */
  process(input: Array<string>, context?: Partial<Context>): Command<Context>;

  /**
   * Runs a command.
   *
   * @param input An array containing the name of the command and its arguments
   * @param context Overrides the Context of the main `Cli` instance
   *
   * @returns The exit code of the command
   */
  run(input: Array<string>, context?: Partial<Context>): Promise<number>;

  /**
   * Returns the usage of a command.
   *
   * @param command The `Command` whose usage will be returned or `null` to return the usage of all commands.
   * @param opts.detailed If `true`, the usage of a command will also include its description, details, and examples. Doesn't have any effect if `command` is `null` or doesn't have a `usage` property.
   * @param opts.prefix The prefix displayed before each command. Defaults to `$`.
   */
  usage(command?: CommandClass<Context> | Command<Context> | null, opts?: {detailed?: boolean, prefix?: string}): string;
};

export type MandatoryContextKeys<Context extends BaseContext> = keyof MandatoryContext<Context>;

export type MandatoryContext<Context extends BaseContext> = {
  [K in Exclude<keyof Context, keyof BaseContext> as undefined extends Context[K] ? never : K]: Context[K];
};

export type UserProvidedContext<Context extends BaseContext> =
  & MandatoryContext<Context>
  & Partial<Omit<Context, MandatoryContextKeys<Context>>>;

export type MaybeProvidedContext<Context extends BaseContext> =
  MandatoryContextKeys<Context> extends never
    ? {context?: UserProvidedContext<Context>}
    : {context: UserProvidedContext<Context>};

export type ProcessOptions<Context extends BaseContext> =
    & MaybeProvidedContext<Context>
    & {
      input: Array<string>,
      /**
       * @deprecated Experimental setting, exact behavior may change
       */
      partial?: boolean,
    };

/**
 * An all-in-one helper that simultaneously instantiate a CLI and immediately
 * executes it. All parameters are optional except the command classes and
 * will be filled by sensible values for the current environment (for example
 * the argv argument will default to `process.argv`, etc).
 *
 * Just like `Cli#runExit`, this function will set the `process.exitCode` value
 * before returning.
 */
export async function runExit<Context extends BaseContext = BaseContext>(commandClasses: RunCommandNoContext<Context>): Promise<void>;
export async function runExit<Context extends BaseContext = BaseContext>(commandClasses: RunCommand<Context>, context: RunContext<Context>): Promise<void>;

export async function runExit<Context extends BaseContext = BaseContext>(options: Partial<CliOptions>, commandClasses: RunCommandNoContext<Context>): Promise<void>;
export async function runExit<Context extends BaseContext = BaseContext>(options: Partial<CliOptions>, commandClasses: RunCommand<Context>, context: RunContext<Context>): Promise<void>;

export async function runExit<Context extends BaseContext = BaseContext>(commandClasses: RunCommandNoContext<Context>, argv: Array<string>): Promise<void>;
export async function runExit<Context extends BaseContext = BaseContext>(commandClasses: RunCommand<Context>, argv: Array<string>, context: RunContext<Context>): Promise<void>;

export async function runExit<Context extends BaseContext = BaseContext>(options: Partial<CliOptions>, commandClasses: RunCommandNoContext<Context>, argv: Array<string>): Promise<void>;
export async function runExit<Context extends BaseContext = BaseContext>(options: Partial<CliOptions>, commandClasses: RunCommand<Context>, argv: Array<string>, context: RunContext<Context>): Promise<void>;

export async function runExit(...args: Array<any>) {
  const {
    resolvedOptions,
    resolvedCommandClasses,
    resolvedArgv,
    resolvedContext,
  } = resolveRunParameters(args);

  const cli = Cli.from(resolvedCommandClasses, resolvedOptions);
  return cli.runExit(resolvedArgv, resolvedContext);
}

/**
 * An all-in-one helper that simultaneously instantiate a CLI and immediately
 * executes it. All parameters are optional except the command classes and
 * will be filled by sensible values for the current environment (for example
 * the argv argument will default to `process.argv`, etc).
 *
 * Unlike `runExit`, this function won't set the `process.exitCode` value
 * before returning.
 */
export async function run<Context extends BaseContext = BaseContext>(commandClasses: RunCommandNoContext<Context>): Promise<number>;
export async function run<Context extends BaseContext = BaseContext>(commandClasses: RunCommand<Context>, context: RunContext<Context>): Promise<number>;

export async function run<Context extends BaseContext = BaseContext>(options: Partial<CliOptions>, commandClasses: RunCommandNoContext<Context>): Promise<number>;
export async function run<Context extends BaseContext = BaseContext>(options: Partial<CliOptions>, commandClasses: RunCommand<Context>, context: RunContext<Context>): Promise<number>;

export async function run<Context extends BaseContext = BaseContext>(commandClasses: RunCommandNoContext<Context>, argv: Array<string>): Promise<number>;
export async function run<Context extends BaseContext = BaseContext>(commandClasses: RunCommand<Context>, argv: Array<string>, context: RunContext<Context>): Promise<number>;

export async function run<Context extends BaseContext = BaseContext>(options: Partial<CliOptions>, commandClasses: RunCommandNoContext<Context>, argv: Array<string>): Promise<number>;
export async function run<Context extends BaseContext = BaseContext>(options: Partial<CliOptions>, commandClasses: RunCommand<Context>, argv: Array<string>, context: RunContext<Context>): Promise<number>;

export async function run(...args: Array<any>) {
  const {
    resolvedOptions,
    resolvedCommandClasses,
    resolvedArgv,
    resolvedContext,
  } = resolveRunParameters(args);

  const cli = Cli.from(resolvedCommandClasses, resolvedOptions);
  return cli.run(resolvedArgv, resolvedContext);
}

function resolveRunParameters(args: Array<any>) {
  let resolvedOptions: any;
  let resolvedCommandClasses: any;
  let resolvedArgv: any;
  let resolvedContext: any;

  if (typeof process !== `undefined` && typeof process.argv !== `undefined`)
    resolvedArgv = process.argv.slice(2);

  switch (args.length) {
    case 1: {
      resolvedCommandClasses = args[0];
    } break;

    case 2: {
      if (args[0] && (args[0].prototype instanceof Command) || Array.isArray(args[0])) {
        resolvedCommandClasses = args[0];
        if (Array.isArray(args[1])) {
          resolvedArgv = args[1];
        } else {
          resolvedContext = args[1];
        }
      } else {
        resolvedOptions = args[0];
        resolvedCommandClasses = args[1];
      }
    } break;

    case 3: {
      if (Array.isArray(args[2])) {
        resolvedOptions = args[0];
        resolvedCommandClasses = args[1];
        resolvedArgv = args[2];
      } else if (args[0] && (args[0].prototype instanceof Command) || Array.isArray(args[0])) {
        resolvedCommandClasses = args[0];
        resolvedArgv = args[1];
        resolvedContext = args[2];
      } else {
        resolvedOptions = args[0];
        resolvedCommandClasses = args[1];
        resolvedContext = args[2];
      }
    } break;

    default: {
      resolvedOptions = args[0];
      resolvedCommandClasses = args[1];
      resolvedArgv = args[2];
      resolvedContext = args[3];
    } break;
  }

  if (typeof resolvedArgv === `undefined`)
    throw new Error(`The argv parameter must be provided when running Clipanion outside of a Node context`);

  return {
    resolvedOptions,
    resolvedCommandClasses,
    resolvedArgv,
    resolvedContext,
  };
}

/**
 * @template Context The context shared by all commands. Contexts are a set of values, defined when calling the `run`/`runExit` functions from the CLI instance, that will be made available to the commands via `this.context`.
 */
export class Cli<Context extends BaseContext = BaseContext> implements Omit<MiniCli<Context>, `process` | `run`> {
  /**
   * The default context of the CLI.
   *
   * Contains the stdio of the current `process`.
   */
  static defaultContext = {
    env: process.env,
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    colorDepth: platform.getDefaultColorDepth(),
  };

  private readonly builder: CliBuilder<CliContext<Context>>;

  protected readonly registrations: Map<CommandClass<Context>, {
    index: number,
    builder: CommandBuilder<CliContext<Context>>,
    specs: Map<string, CommandOption<unknown>>,
  }> = new Map();

  public readonly binaryLabel?: string;
  public readonly binaryName: string;
  public readonly binaryVersion?: string;

  public readonly enableCapture: boolean;
  public readonly enableColors?: boolean;

  /**
   * Creates a new Cli and registers all commands passed as parameters.
   *
   * @param commandClasses The Commands to register
   * @returns The created `Cli` instance
   */
  static from<Context extends BaseContext = BaseContext>(commandClasses: RunCommand<Context>, options: Partial<CliOptions> = {}) {
    const cli = new Cli<Context>(options);

    const resolvedCommandClasses = Array.isArray(commandClasses)
      ? commandClasses
      : [commandClasses];

    for (const commandClass of resolvedCommandClasses)
      cli.register(commandClass);

    return cli;
  }

  constructor({binaryLabel, binaryName: binaryNameOpt = `...`, binaryVersion, enableCapture = false, enableColors}: Partial<CliOptions> = {}) {
    this.builder = new CliBuilder({binaryName: binaryNameOpt});

    this.binaryLabel = binaryLabel;
    this.binaryName = binaryNameOpt;
    this.binaryVersion = binaryVersion;

    this.enableCapture = enableCapture;
    this.enableColors = enableColors;
  }

  /**
   * Registers a command inside the CLI.
   */
  register(commandClass: CommandClass<Context>) {
    if (this.registrations.has(commandClass))
      throw new RangeError(`${commandClass.name} has already been registered`);

    const specs = new Map<string, CommandOption<any>>();

    const command = new commandClass();
    for (const key in command) {
      const value = (command as any)[key];
      if (typeof value === `object` && value !== null && value[Command.isOption]) {
        specs.set(key, value);
      }
    }

    const builder = this.builder.command();
    const index = builder.cliIndex;

    const paths = commandClass.paths ?? command.paths;
    if (typeof paths !== `undefined`)
      for (const path of paths)
        builder.addPath(path);

    this.registrations.set(commandClass, {specs, builder, index});

    for (const [key, {definition}] of specs.entries())
      definition(builder, key);

    builder.setContext({
      commandClass,
    });
  }

  process(opts: ProcessOptions<Context>): Command<Context>;
  process(input: Array<string>, context: VoidIfEmpty<Omit<Context, keyof BaseContext>>): Command<Context>;
  process(input: Array<string>, context: MakeOptional<Context, keyof BaseContext>): Command<Context>;
  process(opts: Array<string> | ProcessOptions<Context>, contextArg?: any) {
    const {input, context: userContext, partial}: ProcessOptions<Context> = typeof opts === `object` && Array.isArray(opts)
      ? {input: opts as any as Array<string>, context: contextArg}
      : opts;

    const {contexts, process} = this.builder.compile();
    const state = process(input, {partial});

    const context = {
      ...Cli.defaultContext,
      ...userContext,
    } as any as Context;

    switch (state.selectedIndex) {
      case HELP_COMMAND_INDEX: {
        const command = HelpCommand.from<Context>(state, contexts);
        command.context = context;
        command.tokens = state.tokens;

        return command;
      } break;

      default: {
        const {commandClass} = contexts[state.selectedIndex!];

        const record = this.registrations.get(commandClass);
        if (typeof record === `undefined`)
          throw new Error(`Assertion failed: Expected the command class to have been registered.`);

        const command = new commandClass();
        command.context = context;
        command.tokens = state.tokens;
        command.path = state.path;

        try {
          for (const [key, {transformer}] of record.specs.entries())
            (command as any)[key] = transformer(record.builder, key, state, context);

          return command;
        } catch (error: any) {
          error[errorCommandSymbol] = command;
          throw error;
        }
      } break;
    }
  }

  async run(input: Command<Context> | Array<string>, context: VoidIfEmpty<Omit<Context, keyof BaseContext>>): Promise<number>;
  async run(input: Command<Context> | Array<string>, context: MakeOptional<Context, keyof BaseContext>): Promise<number>;
  async run(input: Command<Context> | Array<string>, userContext: any) {
    let command: Command<Context>;

    const context = {
      ...Cli.defaultContext,
      ...userContext,
    } as Context;

    const colored = this.enableColors ?? context.colorDepth > 1;

    if (!Array.isArray(input)) {
      command = input;
    } else {
      try {
        command = this.process(input, context);
      } catch (error) {
        context.stdout.write(this.error(error, {colored}));
        return 1;
      }
    }

    if (command.help) {
      context.stdout.write(this.usage(command, {colored, detailed: true}));
      return 0;
    }

    command.context = context;
    command.cli = {
      binaryLabel: this.binaryLabel,
      binaryName: this.binaryName,
      binaryVersion: this.binaryVersion,
      enableCapture: this.enableCapture,
      enableColors: this.enableColors,
      definitions: () => this.definitions(),
      definition: command => this.definition(command),
      error: (error, opts) => this.error(error, opts),
      format: colored => this.format(colored),
      process: (input, subContext?) => this.process(input, {...context, ...subContext}),
      run: (input, subContext?) => this.run(input, {...context, ...subContext} as Context),
      usage: (command, opts) => this.usage(command, opts),
    };

    const activate = this.enableCapture
      ? platform.getCaptureActivator(context) ?? noopCaptureActivator
      : noopCaptureActivator;

    let exitCode;
    try {
      exitCode = await activate(() => command.validateAndExecute().catch(error => command.catch(error).then(() => 0)));
    } catch (error) {
      context.stdout.write(this.error(error, {colored, command}));
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
   * cli.runExit(process.argv.slice(2))
   */
  async runExit(input: Command<Context> | Array<string>, context: VoidIfEmpty<Omit<Context, keyof BaseContext>>): Promise<void>;
  async runExit(input: Command<Context> | Array<string>, context: MakeOptional<Context, keyof BaseContext>): Promise<void>;
  async runExit(input: Command<Context> | Array<string>, context: any) {
    process.exitCode = await this.run(input, context);
  }

  definition(commandClass: CommandClass<Context>, {colored = false}: {colored?: boolean} = {}): Definition | null {
    if (!commandClass.usage)
      return null;

    const {usage: path} = this.getUsageByRegistration(commandClass, {detailed: false});
    const {usage, options} = this.getUsageByRegistration(commandClass, {detailed: true, inlineOptions: false});

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

    return {path, usage, category, description, details, examples, options};
  }

  definitions({colored = false}: {colored?: boolean} = {}): Array<Definition> {
    const data: Array<Definition> = [];

    for (const commandClass of this.registrations.keys()) {
      const usage = this.definition(commandClass, {colored});
      if (!usage)
        continue;

      data.push(usage);
    }

    return data;
  }

  usage(command: CommandClass<Context> | Command<Context> | null = null, {colored, detailed = false, prefix = `$ `}: {colored?: boolean, detailed?: boolean, prefix?: string} = {}) {
    // In case the default command is the only one, we can just show the command help rather than the general one
    if (command === null) {
      for (const commandClass of this.registrations.keys()) {
        const paths = commandClass.paths;

        const isDocumented = typeof commandClass.usage !== `undefined`;
        const isExclusivelyDefault = !paths || paths.length === 0 || (paths.length === 1 && paths[0].length === 0);
        const isDefault = isExclusivelyDefault || (paths?.some(path => path.length === 0) ?? false);

        if (isDefault) {
          if (command) {
            command = null;
            break;
          } else {
            command = commandClass;
          }
        } else {
          if (isDocumented) {
            command = null;
            continue;
          }
        }
      }

      if (command) {
        detailed = true;
      }
    }

    // @ts-ignore
    const commandClass = command !== null && command instanceof Command
      ? command.constructor as CommandClass<Context>
      : command as CommandClass<Context> | null;

    let result = ``;

    if (!commandClass) {
      const commandsByCategories = new Map<string | null, Array<{
        commandClass: CommandClass<Context>;
        usage: string;
      }>>();

      for (const [commandClass, {index}] of this.registrations.entries()) {
        if (typeof commandClass.usage === `undefined`)
          continue;

        const category = typeof commandClass.usage.category !== `undefined`
          ? formatMarkdownish(commandClass.usage.category, {format: this.format(colored), paragraphs: false})
          : null;

        let categoryCommands = commandsByCategories.get(category);
        if (typeof categoryCommands === `undefined`)
          commandsByCategories.set(category, categoryCommands = []);

        const {usage} = this.getUsageByIndex(index);
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
          result += `${this.format(colored).header(`${this.binaryLabel} - ${this.binaryVersion}`)}\n\n`;
        else if (hasLabel)
          result += `${this.format(colored).header(`${this.binaryLabel}`)}\n`;
        else
          result += `${this.format(colored).header(`${this.binaryVersion}`)}\n`;

        result += `  ${this.format(colored).bold(prefix)}${this.binaryName} <command>\n`;
      } else {
        result += `${this.format(colored).bold(prefix)}${this.binaryName} <command>\n`;
      }

      for (const categoryName of categoryNames) {
        const commands = commandsByCategories.get(categoryName)!.slice().sort((a, b) => {
          return a.usage.localeCompare(b.usage, `en`, {usage: `sort`, caseFirst: `upper`});
        });

        const header = categoryName !== null
          ? categoryName.trim()
          : `General commands`;

        result += `\n`;
        result += `${this.format(colored).header(`${header}`)}\n`;

        for (const {commandClass, usage} of commands) {
          const doc = commandClass.usage!.description || `undocumented`;

          result += `\n`;
          result += `  ${this.format(colored).bold(usage)}\n`;
          result += `    ${formatMarkdownish(doc, {format: this.format(colored), paragraphs: false})}`;
        }
      }

      result += `\n`;
      result += formatMarkdownish(`You can also print more details about any of these commands by calling them with the \`-h,--help\` flag right after the command name.`, {format: this.format(colored), paragraphs: true});
    } else {
      if (!detailed) {
        const {usage} = this.getUsageByRegistration(commandClass);
        result += `${this.format(colored).bold(prefix)}${usage}\n`;
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
          result += `${this.format(colored).header(`Usage`)}\n`;
          result += `\n`;
        }

        const {usage, options} = this.getUsageByRegistration(commandClass, {inlineOptions: false});

        result += `${this.format(colored).bold(prefix)}${usage}\n`;

        if (options.length > 0) {
          result += `\n`;
          result += `${this.format(colored).header(`Options`)}\n`;

          const maxDefinitionLength = options.reduce((length, option) => {
            return Math.max(length, option.definition.length);
          }, 0);

          result += `\n`;

          for (const {definition, description} of options) {
            result += `  ${this.format(colored).bold(definition.padEnd(maxDefinitionLength))}    ${formatMarkdownish(description, {format: this.format(colored), paragraphs: false})}`;
          }
        }

        if (details !== ``) {
          result += `\n`;
          result += `${this.format(colored).header(`Details`)}\n`;
          result += `\n`;

          result += formatMarkdownish(details, {format: this.format(colored), paragraphs: true});
        }

        if (examples.length > 0) {
          result += `\n`;
          result += `${this.format(colored).header(`Examples`)}\n`;

          for (const [description, example] of examples) {
            result += `\n`;
            result += formatMarkdownish(description, {format: this.format(colored), paragraphs: false});
            result += `${example
              .replace(/^/m, `  ${this.format(colored).bold(prefix)}`)
              .replace(/\$0/g, this.binaryName)
            }\n`;
          }
        }
      }
    }

    return result;
  }

  error(error: Error | any, {colored, command = error[errorCommandSymbol] ?? null}: {colored?: boolean, command?: Command<Context> | null} = {}) {
    if (!error || typeof error !== `object` || !(`stack` in error))
      error = new Error(`Execution failed with a non-error rejection (rejected value: ${JSON.stringify(error)})`);

    let result = ``;

    let name = error.name.replace(/([a-z])([A-Z])/g, `$1 $2`);
    if (name === `Error`)
      name = `Internal Error`;

    result += `${this.format(colored).error(name)}: ${error.message}\n`;

    const meta = error.clipanion as ErrorMeta | undefined;

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

  format(colored?: boolean): ColorFormat {
    return colored ?? this.enableColors ?? Cli.defaultContext.colorDepth > 1 ? richFormat : textFormat;
  }

  protected getUsageByRegistration(klass: CommandClass<Context>, opts?: {detailed?: boolean; inlineOptions?: boolean}) {
    const record = this.registrations.get(klass);
    if (typeof record === `undefined`)
      throw new Error(`Assertion failed: Unregistered command`);

    return this.getUsageByIndex(record.index, opts);
  }

  protected getUsageByIndex(n: number, opts?: {detailed?: boolean; inlineOptions?: boolean}) {
    return this.builder.getBuilderByIndex(n).usage(opts);
  }
}

function noopCaptureActivator(fn: () => Promise<number>) {
  return fn();
}
