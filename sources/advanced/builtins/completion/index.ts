import {CompletionCleanupCommand}  from './completionCleanup';
import {CompletionDebugCommand}    from './completionDebug';
import {CompletionProviderCommand} from './completionProvider';
import {CompletionRequestCommand}  from './completionRequest';
import {CompletionSetupCommand}    from './completionSetup';

export type CompletionCommandsOptions = {
  completionSetupCommandPaths?: Array<Array<string>>;
  completionCleanupCommandPaths?: Array<Array<string>>;
  completionProviderCommandPaths?: Array<Array<string>>;
  completionRequestCommandPaths?: Array<Array<string>>;
  completionDebugCommandPaths?: Array<Array<string>>;
};

export function CompletionCommands({
  completionSetupCommandPaths,
  completionCleanupCommandPaths,
  completionProviderCommandPaths,
  completionRequestCommandPaths,
  completionDebugCommandPaths,
}: CompletionCommandsOptions = {}) {
  return [
    CompletionSetupCommand({paths: completionSetupCommandPaths, completionProviderCommandPaths}),
    CompletionCleanupCommand({paths: completionCleanupCommandPaths, completionProviderCommandPaths}),
    CompletionProviderCommand({paths: completionProviderCommandPaths, completionRequestCommandPaths}),
    CompletionRequestCommand({paths: completionRequestCommandPaths}),
    CompletionDebugCommand({paths: completionDebugCommandPaths}),
  ];
}

export {
  CompletionSetupCommand,
  CompletionCleanupCommand,
  CompletionProviderCommand,
  CompletionRequestCommand,
  CompletionDebugCommand,
};
