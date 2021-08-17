import {processCompletionProviderRequest} from 'clcs';

import {Command}                          from '../../Command';
import * as Option                        from '../../options';
import {BuiltinOptions}                   from '../utils';

export type CompletionProviderCommandOptions = BuiltinOptions & {
  completionRequestCommandPaths?: Array<Array<string>>;
};

/**
 * A command that prints the requested completion provider source to stdout to be registered by the shell.
 *
 * Default Paths: `completion`
 */
export function CompletionProviderCommand({paths = [[`completion`]], completionRequestCommandPaths = [[`completion`, `request`]]}: CompletionProviderCommandOptions = {}) {
  return class CompletionProviderCommand extends Command<any> {
    static paths = paths;

    shellName = Option.String();

    async execute() {
      return await processCompletionProviderRequest({
        binaryName: this.cli.binaryName,
        requestCompletionCommand: [this.cli.binaryName, ...completionRequestCommandPaths[0] ?? []].join(` `),
        shellName: this.shellName,
        stdout: this.context.stdout,
      });
    }
  };
}
