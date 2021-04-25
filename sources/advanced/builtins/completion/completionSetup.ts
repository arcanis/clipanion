import {setupShellConfigurationFile} from 'clcs';

import {Command}                     from '../../Command';
import {Option}                      from '../..';

export class CompletionSetupCommand extends Command<any> {
  static paths = [[`completion`, `setup`]];

  shellName = Option.String({required: false});

  async execute() {
    return await setupShellConfigurationFile({
      getCompletionProviderCommand: `${this.cli.binaryName} completion`,
      shellName: this.shellName,
    });
  }
}
