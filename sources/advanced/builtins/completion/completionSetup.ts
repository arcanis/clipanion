import {setupShellConfigurationFile, validateBinaryName, getSupportedShells} from 'clcs';

import {Command}                                                             from '../../Command';
import * as Option                                                           from '../../options';
import {BuiltinOptions}                                                      from '../utils';

export type CompletionSetupCommandOptions = BuiltinOptions & {
  binaryName?: string;
  completionProviderCommandPaths?: Array<Array<string>>;
};

/**
 * A command that adds the completion block (which registers the completion provider) to the user's shell configuration file.
 *
 * Default Paths: `completion setup`
 */
export function CompletionSetupCommand({paths = [[`completion`, `setup`]], completionProviderCommandPaths = [[`completion`]], binaryName}: CompletionSetupCommandOptions = {}) {
  const mainPath = paths[0] ?? [];
  const exampleUsagePath = [`$0`, ...mainPath].join(` `);

  return class CompletionSetupCommand extends Command<any> {
    static paths = paths;

    static usage = Command.Usage({
      description: `add the completion block to the shell configuration file`,
      details: `
        This command adds the completion block (which registers the completion provider) to the shell configuration file.

        If the shell is not specified, the default shell will be detected from the environment.

        Supported shells: ${getSupportedShells().join(`, `)}.

        This command validates the binary name to ensure that it's valid to be used by the shells.

        **Note:** This command also removes all previous occurrences of the completion block from the shell configuration file to prevent duplicates from appearing.
      `,
      examples: [[
        `Add the completion block to the default shell configuration file`,
        exampleUsagePath,
      ], [
        `Add the completion block to the zsh configuration file`,
        `${exampleUsagePath} zsh`,
      ]],
    });

    shellName = Option.String({required: false});

    async execute() {
      const actualBinaryName = binaryName ?? this.cli.binaryName;

      // We make sure that we don't register a completion provider for an invalid binary before writing to the shell configuration file.
      validateBinaryName(actualBinaryName);

      return await setupShellConfigurationFile({
        completionProviderCommand: [actualBinaryName, ...completionProviderCommandPaths[0] ?? []].join(` `),
        shellName: this.shellName,
      });
    }
  };
}
