import type {Writable}                     from 'stream';

import {getDriver}                         from './drivers';
import type {GetCompletionProviderOptions} from './types';

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
  const driver = getDriver(shellName);
  stdout.write(`${driver.getCompletionProvider(getCompletionProviderOptions)}\n`);
}
