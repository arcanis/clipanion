import {Command}        from '../Command';

import {BuiltinOptions} from './utils';

/**
 * A command that prints the Clipanion definitions.
 *
 * Default Paths: `--clipanion=definitions`
 */
export function DefinitionsCommand({paths = [[`--clipanion=definitions`]]}: BuiltinOptions = {}) {
  return class DefinitionsCommand extends Command<any> {
    static paths = paths;
    async execute() {
      this.context.stdout.write(`${JSON.stringify(this.cli.definitions(), null, 2)}\n`);
    }
  };
}
