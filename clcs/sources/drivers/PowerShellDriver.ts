import {homedir}          from 'os';
import path               from 'path';

import type {ShellDriver} from '../types';

/**
 * A driver for PowerShell Core.
 *
 * TODO: make it also support Windows PowerShell
 *
 * Shell Documentation: https://docs.microsoft.com/en-us/powershell/
 */
const PowerShellDriver: ShellDriver = {
  shellName: `pwsh`,

  isDefaultShell: () =>
    process.platform === `win32`
      // Windows doesn't have the concept of a default shell, so the closest we can get is
      // "PowerShell is installed (aka $PSModulePath is defined) and $SHELL is not defined
      // ($SHELL is a Unix-only concept but it's also shimmed by Windows shells like Git Bash)"
      ? typeof process.env.PSModulePath !== `undefined` && typeof process.env.SHELL === `undefined`
      // Unix - checking $SHELL
      : !!process.env.SHELL?.includes(`pwsh`),

  getShellConfigurationFile: () =>
    process.platform === `win32`
      // Current user, Current Host: $Home\[My ]Documents\PowerShell\Microsoft.PowerShell_profile.ps1
      // https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles#the-profile-files
      // TODO: Support `[My ]Documents\\...`
      ? path.join(homedir(), `Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1`)
      // Respects XDG Base Directory Specification:
      // https://docs.microsoft.com/en-us/powershell/scripting/whats-new/what-s-new-in-powershell-core-60#filesystem
      : path.join(homedir(), `.config/powershell/Microsoft.PowerShell_profile.ps1`),

  getCompletionBlock: ({getCompletionProviderCommand}) =>
    `${getCompletionProviderCommand} ${PowerShellDriver.shellName} | Out-String | Invoke-Expression`,

  // Completion system documentation: https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/register-argumentcompleter
  getCompletionProvider: ({binaryName, requestCompletionCommand}) => `
    Register-ArgumentCompleter -Native -CommandName ${binaryName} -ScriptBlock {
      param($wordToComplete, $commandAst, $cursorPosition)
        $results = ${requestCompletionCommand} ${PowerShellDriver.shellName} "--" "$commandAst" "$cursorPosition" 2>$null | ConvertFrom-Json
        $results |
          # select completions that match the original word
          ? { $_.CompletionText -like "$wordToComplete*" } |
          % { [System.Management.Automation.CompletionResult]::new($_.CompletionText, $_.ListItemText, $_.ResultType, $_.ToolTip) }
    }
  `,

  getReply: completionResults =>
    JSON.stringify(
      completionResults.map(result => ({
        CompletionText: result.completionText,
        ListItemText: result.listItemText,
        // PowerShell doesn't accept empty strings
        ToolTip: result.description || ` `,
        // https://docs.microsoft.com/en-us/dotnet/api/system.management.automation.completionresulttype
        // "Text - An unknown result type, kept as text only"
        // TODO: add support for configurable `ResultType`s
        ResultType: `Text`,
      })),
    ),
};

export {PowerShellDriver};
