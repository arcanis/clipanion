import {Command}        from '../Command';

import {BuiltinOptions} from './utils';

/**
 * A command that prints the usage of all commands.
 *
 * Default Paths: `-h`, `--help`
 */
export function HelpCommand({paths = [[`-h`], [`--help`]]}: BuiltinOptions = {}) {
  return class HelpCommand extends Command<any> {
    static paths = paths;
    async execute() {
      this.context.stdout.write(this.cli.usage());
    }
  };
}
