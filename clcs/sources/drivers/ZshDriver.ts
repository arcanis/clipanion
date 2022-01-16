import {homedir}          from 'os';
import path               from 'path';

import type {ShellDriver} from '../types';

/**
 * A driver for the zsh shell.
 *
 * Shell Documentation: http://zsh.sourceforge.net/Doc/Release/zsh_toc.html
 *
 * Background: zsh supports 3 different completion systems:
 * - `bashcompinit` (https://stackoverflow.com/questions/3249432/can-a-bash-tab-completion-script-be-used-in-zsh) - the bash completion system - not that powerful and
 * doesn't support descriptions without workarounds that aren't supported by zsh
 * - `compctl` (http://zsh.sourceforge.net/Doc/Release/Completion-Using-compctl.html) - the "old" completion system - powerful but doesn't support dynamic descriptions
 * - `compsys` (http://zsh.sourceforge.net/Doc/Release/Completion-System.html) - the "new" completion system - very powerful but very comprehensive and not so easy to
 * understand, supports dynamic descriptions
 *
 * `clcs` uses `compsys`, because it's the most powerful.
 *
 * References:
 * - https://zv.github.io/a-review-of-zsh-completion-utilities
 * - https://github.com/zsh-users/zsh-completions/blob/master/zsh-completions-howto.org
 * - https://linux.die.net/man/1/zshcompsys
 * - https://stackoverflow.com/questions/42846273/zsh-compadd-how-to-specify-arguments-description
 */
const ZshDriver: ShellDriver = {
  shellName: `zsh`,

  // Unix-only shell - checking $SHELL
  isDefaultShell: () => !!process.env.SHELL?.includes(`zsh`),

  // http://zsh.sourceforge.net/Guide/zshguide02.html#l9
  getShellConfigurationFile: () => path.join(homedir(), `.zshrc`),

  getCompletionBlock: ({completionProviderCommand}) =>
    `. <(${completionProviderCommand} ${ZshDriver.shellName})`,

  // Completion system documentation: http://zsh.sourceforge.net/Doc/Release/Completion-System.html
  //
  // Variables used:
  // - $words is an array corresponding to the words on the command line
  // - $CURSOR is the index of the cursor into the command line buffer
  getCompletionProvider: ({binaryName, completionRequestCommand}) => `
    _${binaryName}_completions() {
      # "The array [...] contains the possible completions [...]"
      local results=(
        # split by newline
        \${(@f)"$( \\
          ${completionRequestCommand} ${ZshDriver.shellName} -- "$words" "$CURSOR" 2>/dev/null \\
        )"}
      )

      # "Hence it is possible for the completion group to be unsorted by giving the option ‘-V’"
      # http://zsh.sourceforge.net/Doc/Release/Completion-System.html#Completion-Functions
      _describe -V 'command' results
    }

    # http://zsh.sourceforge.net/Doc/Release/Completion-System.html#Functions-4
    compdef _${binaryName}_completions ${binaryName}
  `,

  getReply: completionResults =>
    completionResults
      // "possible completions with their descriptions in the form ‘completion:description’"
      .map(result =>
        typeof result.description === `string`
          ? `${result.completionText}:${result.description}`
          : result.completionText,
      )
      // we split by newline in the completion provider
      .join(`\n`),
};

export {ZshDriver};
