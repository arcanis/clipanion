import type {CompletionRequest, ShellCompletionRequest} from './types';

/**
 * Normalizes shell completion requests into regular completion requests that are sent to the completion functions.
 */
export function normalizeShellCompletionRequest(
  shellCompletionRequest: ShellCompletionRequest,
): CompletionRequest {
  const cursorPosition = Number(shellCompletionRequest.cursorPosition);
  if (!Number.isInteger(cursorPosition)) {
    throw new TypeError(
      `Expected cursorPosition to be an integer, got ${JSON.stringify(cursorPosition)}`,
    );
  }

  if (cursorPosition > shellCompletionRequest.input.length)
    // eslint-disable-next-line no-param-reassign
    shellCompletionRequest.input += ` `;


  const [binaryName, ...input] = shellCompletionRequest.input.split(` `);
  if (typeof binaryName === `undefined`)
    throw new TypeError(`Expected binaryName to be defined`);


  return {
    input,
    cursorPosition: cursorPosition - (binaryName.length + 1),
  };
}
