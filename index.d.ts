import {Readable, Writable} from 'stream';

export type Validator = any;
export type Environment = any;

export class UsageError extends Error {
  constructor(message: string);

  message: string;
  isUsageError: true;
}

type ExitCode = number | void;

export interface Command {
  validate(validator: Validator): Command;

  alias(pattern: string): Command;
  aliases(... args: Array<string>): Command;

  flags(opt: any): Command;

  categorize(category: string): Command;
  describe(description: string): Command;
  detail(details: string): Command;
  example(description: string, example: string): Command;

  action(action: (env: Environment) => ExitCode | Promise<ExitCode>): Command;
}

export class Clipanion {
  constructor(opts: {Joi?: any, configKey?: string | null});

  beforeEach(callback: (env: Environment) => void): Clipanion;
  afterEach(callback: (env: Environment) => void): Clipanion;

  directory(startingPath: string | any, recursive?: boolean, pattern?: RegExp): Clipanion;

  topLevel(pattern: string): Clipanion;
  command(pattern: string): Command;

  validate(validator: Validator): Clipanion;

  error(error: Error, opts: {stream: Writable}): void;
  usage(argv0: string, opts: {command?: Command | null, error?: Error | null, stream?: Writable}): void;

  check(): void;

  parse(argv: Array<string>, initialEnv?: Partial<Environment>): {commandPath: Array<string>, selectedCommand: Command, rest: Array<string>, env: Environment};

  run(argv0: string, argv: Array<string>, opts?: Partial<Environment>): ExitCode | Promise<ExitCode>;
  runExit(argv0: string, argv: Array<string>, opts?: Partial<Environment>): Promise<void>;
}

export const clipanion: Clipanion;
