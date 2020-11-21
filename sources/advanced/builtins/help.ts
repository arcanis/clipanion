import {Command} from '../Command';

        /**
         * A command that prints the usage of all commands.
         *
         * Paths: `-h`, `--help`
         */
export class HelpCommand extends Command<any> {
  static paths = [[`-h`], [`--help`]];
  async execute() {
    this.context.stdout.write(this.cli.usage(null));
  }
}