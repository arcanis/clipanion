import {homedir}          from 'os';
import path               from 'path';

import type {ShellDriver} from '../types';

/**
 * A driver for the fish shell.
 *
 * Shell Documentation: https://fishshell.com/docs/current/index.html
 */
const FishDriver: ShellDriver = {
  shellName: `fish`,

  // Unix-only shell - checking $SHELL
  isDefaultShell: () => !!process.env.SHELL?.includes(`fish`),

  // https://fishshell.com/docs/current/tutorial.html#startup-where-s-bashrc
  getShellConfigurationFile: () => path.join(homedir(), `.config/fish/config.fish`),

  getCompletionBlock: ({getCompletionProviderCommand}) =>
    `${getCompletionProviderCommand} ${FishDriver.shellName} | source`,

  // Completion system documentation: https://fishshell.com/docs/current/cmds/complete.html
  getCompletionProvider: ({binaryName, requestCompletionCommand}) => `
    complete \\
      --command ${binaryName} \\
      --arguments '( \\
        ${requestCompletionCommand} ${FishDriver.shellName} \\
        -- \\
        # entire command line buffer, including any displayed autosuggestion
        (commandline -pb) \\
        # length of command line buffer, cut at cursor
        (string length (commandline -pc)) \\
        2>/dev/null \\
      )' \\
      --keep-order \\
      --no-files
  `,

  getReply: completionResults =>
    completionResults
      // "each argument may optionally have a tab character followed by the argument description"
      .map(result =>
        typeof result.description === `string`
          ? `${result.completionText}\t${result.description}`
          : result.completionText,
      )
      // "they must return a newline-separated list of arguments"
      .join(`\n`),
};

export {FishDriver};
