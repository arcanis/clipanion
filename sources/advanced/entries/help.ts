import {Command} from '../Command';

export class HelpCommand extends Command<any> {
  static paths = [`-h`, `--help`];
  async execute() {
    this.context.stdout.write(this.cli.usage(null));
  }
}