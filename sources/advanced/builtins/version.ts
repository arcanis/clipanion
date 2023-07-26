import {Command}        from '../Command';

import {BuiltinOptions} from './utils';

/**
 * A command that prints the version of the binary (`cli.binaryVersion`).
 *
 * Default Paths: `-v`, `--version`
 */
export function VersionCommand({paths = [[`-v`], [`--version`]]}: BuiltinOptions = {}) {
  return class VersionCommand extends Command<any> {
    static paths = paths;
    async execute() {
      this.context.stdout.write(`${this.cli.binaryVersion ?? `<unknown>`}\n`);
    }
  };
}
