import {processCompletionProviderRequest} from 'clcs';

import {Command}                          from '../../Command';
import {Option}                           from '../..';

export class CompletionProviderCommand extends Command<any> {
  static paths = [[`completion`]];

  shellName = Option.String();

  async execute() {
    return await processCompletionProviderRequest({
      binaryName: this.cli.binaryName,
      requestCompletionCommand: `${this.cli.binaryName} completion request`,
      shellName: this.shellName,
      stdout: this.context.stdout,
    });
  }
}
