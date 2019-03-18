import {Readable, Writable} from 'stream';

export type Validator = any;
export type Environment = any;

export class UsageError {
  constructor(message: string);

  message: string;
  isUsageError: true;
}

export interface Command {
  validate(validator: Validator): Command;

  alias(pattern: string): Command;
  aliases(... args: Array<string>): Command;

  flags(opt: any): Command;

  categorize(category: string): Command;
  describe(description: string): Command;
  detail(details: string): Command;
  example(description: string, example: string): Command;

  action(action: (env: Environment) => Promise<Number | undefined> | Number | undefined): Command;
}

export class Concierge {
  constructor(opts: {Joi?: any, configKey?: string | null});

  beforeEach(callback: (env: Environment) => void): Concierge;
  afterEach(callback: (env: Environment) => void): Concierge;

  directory(startingPath: string | any, recursive?: boolean, pattern?: RegExp): Concierge;

  topLevel(pattern: string): Concierge;
  command(pattern: string): Command;

  validate(validator: Validator): Concierge;

  error(error: Error, opts: {stream: Writable}): void;
  usage(argv0: string, opts: {command?: Command | null, error?: Error | null, stream?: Writable}): void;

  check(): void;

  run(argv0: string, argv: Array<string>, opts?: Partial<Environment>): Promise<Number | undefined> | Number | undefined;
  runExit(argv0: string, argv: Array<string>, opts?: Partial<Environment>): Promise<void>;
}

export default Concierge;
