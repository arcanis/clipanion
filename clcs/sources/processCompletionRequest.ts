import type {Writable}                                   from 'stream';

import {getDriver}                                       from './drivers';
import {normalizeCompletionResults}                      from './normalizeCompletionResults';
import {normalizeShellCompletionRequest}                 from './normalizeShellCompletionRequest';
import type {CompletionFunction, ShellCompletionRequest} from './types';

/**
 * The options of the `processCompletionRequest` function.
 */
export interface ProcessCompletionRequestOptions extends ShellCompletionRequest {
  shellName: string;
  stdout?: Writable;
}

export async function processCompletionRequest(
  {
    shellName,
    stdout = process.stdout,
    ...shellCompletionRequest
  }: ProcessCompletionRequestOptions,
  getCompletion: CompletionFunction,
): Promise<void> {
  const completionRequest = normalizeShellCompletionRequest(shellCompletionRequest);

  const results = await getCompletion(completionRequest);

  const driver = getDriver(shellName);

  stdout.write(`${driver.getReply(normalizeCompletionResults(results))}\n`);
}
