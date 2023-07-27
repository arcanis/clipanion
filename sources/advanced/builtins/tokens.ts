import {Proxy}   from '../options/Proxy';
import {Command} from '../Command';

/**
 * A command that prints the clipanion tokens.
 */
export class TokensCommand extends Command<any> {
  static paths = [[`--clipanion=tokens`]];

  args = Proxy();

  async execute() {
    this.context.stdout.write(`${JSON.stringify(this.cli.process(this.args).tokens, null, 2)}\n`);
  }
}
