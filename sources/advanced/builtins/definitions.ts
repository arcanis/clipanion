import {Command} from '../Command';

/**
 * A command that prints the clipanion definitions.
 */
export class DefinitionsCommand extends Command<any> {
  static paths = [[`--clipanion=definitions`]];

  async execute() {
    this.context.stdout.write(`${JSON.stringify(this.cli.definitions(), null, 2)}\n`);
  }
}
