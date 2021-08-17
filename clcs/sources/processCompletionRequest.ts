import {getDriver}                                       from './drivers';
import {normalizeCompletionResults}                      from './normalizeCompletionResults';
import {normalizeShellCompletionRequest}                 from './normalizeShellCompletionRequest';
import * as stdoutUtils                                  from './stdoutUtils';
import type {CompletionFunction, ShellCompletionRequest} from './types';

/**
 * The options of the `processCompletionRequest` function.
 */
export interface ProcessCompletionRequestOptions extends ShellCompletionRequest, Partial<stdoutUtils.TraceAndRedirectStdoutOptions> {
  shellName: string;
}

/**
 * Processes a completion request and writes the results to stdout to be processed by the shell.
 *
 * Also redirects all stdout writes to stderr and adds a stack trace to them.
 */
export async function processCompletionRequest(
  {
    shellName,
    stdout = process.stdout,
    stderr = process.stderr,
    ...shellCompletionRequest
  }: ProcessCompletionRequestOptions,
  getCompletion: CompletionFunction,
): Promise<void> {
  const completionRequest = normalizeShellCompletionRequest(shellCompletionRequest);

  const results = await stdoutUtils.traceAndRedirectStdout(
    {stdout, stderr},
    () => getCompletion(completionRequest)
  );

  const driver = getDriver(shellName);

  stdout.write(`${driver.getReply(normalizeCompletionResults(results))}\n`);
}
