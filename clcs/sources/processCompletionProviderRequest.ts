import type {Writable}                     from 'stream';

import {getDriver}                         from './drivers';
import type {GetCompletionProviderOptions} from './types';
import {validateBinaryName}                from './validators';

/**
 * The options of the `processCompletionProviderRequest` function.
 */
export interface ProcessCompletionProviderRequestOptions extends GetCompletionProviderOptions {
  shellName: string;
  stdout?: Writable;
}

/**
 *  Prints the requested completion provider source to stdout to be registered by the shell.
 */
export async function processCompletionProviderRequest({
  shellName,
  stdout = process.stdout,
  ...getCompletionProviderOptions
}: ProcessCompletionProviderRequestOptions): Promise<void> {
  validateBinaryName(getCompletionProviderOptions.binaryName);

  const driver = getDriver(shellName);
  stdout.write(`${driver.getCompletionProvider(getCompletionProviderOptions)}\n`);
}
