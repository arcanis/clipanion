import type {CompletionRequest, ShellCompletionRequest} from './types';

/**
 * Normalizes shell completion requests into regular completion requests that are sent to the completion functions.
 */
export function normalizeShellCompletionRequest(
  shellCompletionRequest: ShellCompletionRequest,
): CompletionRequest {
  const cursorPosition = Number(shellCompletionRequest.cursorPosition);
  if (!Number.isInteger(cursorPosition))
    throw new Error(`Expected cursorPosition to be an integer, got ${JSON.stringify(cursorPosition)}`);

  if (cursorPosition > shellCompletionRequest.input.length)
    shellCompletionRequest.input += ` `;

  const [binaryName, ...input] = shellCompletionRequest.input.split(` `);
  if (typeof binaryName === `undefined`)
    throw new Error(`Expected binaryName to be defined`);

  return {
    input: input.join(` `),
    cursorPosition: cursorPosition - (binaryName.length + 1),
  };
}
