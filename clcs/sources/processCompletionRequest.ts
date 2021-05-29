import type {Writable}                                   from 'stream';

import {getDriver}                                       from './drivers';
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

  let results = await getCompletion(completionRequest);
  if (!Array.isArray(results))
    results = [results];


  const richResultHashes = new Set<string>();
  const richResults = [];

  for (const result of results) {
    const richResult = typeof result === `string` ? {completionText: result} : result;
    const normalizedRichResult = {
      ...richResult,
      listItemText: richResult.listItemText ?? richResult.completionText,
    };

    const hash = JSON.stringify(normalizedRichResult);
    if (richResultHashes.has(hash))
      continue;

    richResults.push(normalizedRichResult);
    richResultHashes.add(hash);
  }

  const driver = getDriver(shellName);

  stdout.write(driver.getReply(richResults));
}
