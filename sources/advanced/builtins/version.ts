import {Command} from '../Command';

/**
 * A command that prints the version of the binary (`cli.binaryVersion`).
 *
 * Paths: `-v`, `--version`
 */
export class VersionCommand extends Command<any> {
  static paths = [[`-v`], [`--version`]];
  async execute() {
    this.context.stdout.write(`${this.cli.binaryVersion ?? `<unknown>`}\n`);
  }
}
