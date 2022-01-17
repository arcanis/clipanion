import {setupShellConfigurationFile, validateBinaryName} from 'clcs';

import {Command}                                         from '../../Command';
import * as Option                                       from '../../options';
import {BuiltinOptions}                                  from '../utils';

export type CompletionSetupCommandOptions = BuiltinOptions & {
  completionProviderCommandPaths?: Array<Array<string>>;
};

/**
 * A command that adds the completion block (which registers the completion provider) to the user's shell configuration file.
 *
 * Default Paths: `completion setup`
 */
export function CompletionSetupCommand({paths = [[`completion`, `setup`]], completionProviderCommandPaths = [[`completion`]]}: CompletionSetupCommandOptions = {}) {
  return class CompletionSetupCommand extends Command<any> {
    static paths = paths;

    shellName = Option.String({required: false});

    async execute() {
      // We make sure that we don't register a completion provider for an invalid binary before writing to the shell configuration file.
      validateBinaryName(this.cli.binaryName);

      return await setupShellConfigurationFile({
        completionProviderCommand: [this.cli.binaryName, ...completionProviderCommandPaths[0] ?? []].join(` `),
        shellName: this.shellName,
      });
    }
  };
}
