import {cleanupShellConfigurationFile} from 'clcs';

import {Command}                       from '../../Command';
import {Option}                        from '../..';

export class CompletionCleanupCommand extends Command<any> {
  static paths = [[`completion`, `cleanup`]];

  shellName = Option.String({required: false});

  async execute() {
    return await cleanupShellConfigurationFile({
      getCompletionProviderCommand: `${this.cli.binaryName} completion`,
      shellName: this.shellName,
    });
  }
}
