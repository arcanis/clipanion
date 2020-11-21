import {Command} from '../Command';

export class VersionCommand extends Command<any> {
  static paths = [`-v`, `--version`];
  async execute() {
    this.context.stdout.write(`${this.cli.binaryVersion ?? `<unknown>`}\n`);
  }
}
