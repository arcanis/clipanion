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

  const normalizedInput = input.join(` `);
  const normalizedCursorPosition = cursorPosition - (binaryName.length + 1);

  return {
    current: normalizedInput,
    prefix: normalizedInput.slice(0, normalizedCursorPosition),
    suffix: normalizedInput.slice(normalizedCursorPosition),
  };
}
