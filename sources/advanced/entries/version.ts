import {Command} from '../Command';

export class VersionCommand extends Command {
  @Command.Path(`--version`)
  @Command.Path(`-v`)
  async execute() {
    this.context.stdout.write(`${this.cli.binaryVersion ?? `<unknown>`}\n`);
  }
}