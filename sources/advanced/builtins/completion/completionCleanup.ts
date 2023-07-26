import {cleanupShellConfigurationFile, getSupportedShells} from 'clcs';

import {Command}                                           from '../../Command';
import * as Option                                         from '../../options';
import {BuiltinOptions}                                    from '../utils';

export type CompletionCleanupCommandOptions = BuiltinOptions & {
  completionProviderCommandPaths?: Array<Array<string>>;
};

/**
 * A command that removes the completion block (which registers the completion provider) from the user's shell configuration file.
 *
 * Default Paths: `completion cleanup`
 */
export function CompletionCleanupCommand({paths = [[`completion`, `cleanup`]], completionProviderCommandPaths = [[`completion`]]}: CompletionCleanupCommandOptions = {}) {
  const mainPath = paths[0] ?? [];
  const exampleUsagePath = [`$0`, ...mainPath].join(` `);

  return class CompletionCleanupCommand extends Command<any> {
    static paths = paths;

    static usage = Command.Usage({
      description: `removes the completion block from the shell configuration file`,
      details: `
        This command removes the completion block (which registers the completion provider) from the shell configuration file.

        If the shell is not specified, the default shell will be detected from the environment.

        Supported shells: ${getSupportedShells().join(`, `)}.
      `,
      examples: [[
        `Remove the completion block from the default shell configuration file`,
        exampleUsagePath,
      ], [
        `Remove the completion block from the zsh configuration file`,
        `${exampleUsagePath} zsh`,
      ]],
    });

    shellName = Option.String({required: false});

    async execute({binaryName = this.cli.binaryName}: {binaryName?: string} = {}) {
      return await cleanupShellConfigurationFile({
        completionProviderCommand: [binaryName, ...completionProviderCommandPaths[0] ?? []].join(` `),
        shellName: this.shellName,
      });
    }
  };
}
