import {cleanupShellConfigurationFile} from 'clcs';

import {Command}                       from '../../Command';
import * as Option                     from '../../options';
import {BuiltinOptions}                from '../utils';

export type CompletionCleanupCommandOptions = BuiltinOptions & {
  completionProviderCommandPaths?: Array<Array<string>>;
};

/**
 * A command that removes the completion block (which registers the completion provider) from the user's shell configuration file.
 *
 * Default Paths: `completion cleanup`
 */
export function CompletionCleanupCommand({paths = [[`completion`, `cleanup`]], completionProviderCommandPaths = [[`completion`]]}: CompletionCleanupCommandOptions = {}) {
  return class CompletionCleanupCommand extends Command<any> {
    static paths = paths;

    shellName = Option.String({required: false});

    async execute() {
      return await cleanupShellConfigurationFile({
        getCompletionProviderCommand: [this.cli.binaryName, ...completionProviderCommandPaths[0] ?? []].join(` `),
        shellName: this.shellName,
      });
    }
  };
}
