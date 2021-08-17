import {Console}                                         from 'console';
import {inspect}                                         from 'util';

import {normalizeCompletionResults}                      from './normalizeCompletionResults';
import {normalizeShellCompletionRequest}                 from './normalizeShellCompletionRequest';
import * as stdoutUtils                                  from './stdoutUtils';
import type {CompletionFunction, ShellCompletionRequest} from './types';

const COMPLETION_TEXT = `completionText`;
const LIST_ITEM_TEXT = `listItemText`;
const DESCRIPTION = `description`;

const format = (text: string) => inspect(text, {colors: true});

const getMaxTextLength = (text: string, maxLength: number) => {
  return maxLength
    - (format(text).length - text.length)
    // util.inspect adds single quotes as visible characters
    + 2;
};

const padText = (text: string, maxLength: number) => text.padEnd(getMaxTextLength(text, maxLength));
const repeatText = (text: string, maxLength: number) => text.repeat(getMaxTextLength(text, maxLength));

/**
 * The options of the `debugCompletionRequest` function.
 */
export interface DebugCompletionRequestOptions extends Omit<ShellCompletionRequest, 'cursorPosition'>, Partial<stdoutUtils.TraceAndRedirectStdoutOptions> {
}

/**
 * Measures the performance of processing and answering completion requests and pretty-prints the completion results to stdout.
 *
 * Also redirects all stdout writes to stderr and adds a stack trace to them.
 */
export async function debugCompletionRequest(
  {
    stdout = process.stdout,
    stderr = process.stderr,
    ...shellCompletionRequest
  }: DebugCompletionRequestOptions,
  getCompletion: CompletionFunction,
): Promise<void> {
  if (!shellCompletionRequest.input.includes(`|`))
    throw new Error(`Missing cursor ("|") in input`);

  const interpolatedRequest = {
    input: shellCompletionRequest.input.replace(`|`, ``),
    cursorPosition: String(shellCompletionRequest.input.indexOf(`|`)),
  };

  const console = new Console(stdout, stderr);

  console.time(`Time spent normalizing the completion request`);
  const completionRequest = normalizeShellCompletionRequest(interpolatedRequest);
  console.timeEnd(`Time spent normalizing the completion request`);

  let results = null;

  console.time(`Time spent gathering completions`);
  await stdoutUtils.traceAndRedirectStdout({stdout, stderr}, async () => {
    try {
      results = await getCompletion(completionRequest);
    } catch (error) {
      const reason = error instanceof Error
        ? error.stack ?? error.message
        : `Non-error rejection: ${JSON.stringify(error)}`;
      console.error(`Failed to gather completions:\n  ${reason}`);
    }
  });
  console.timeEnd(`Time spent gathering completions`);

  if (results === null)
    return;

  console.time(`Time spent normalizing completion results`);
  const normalizedResults = normalizeCompletionResults(results);
  console.timeEnd(`Time spent normalizing completion results`);

  console.log();

  const prettyResults = normalizedResults.map(({completionText, listItemText, description}) => ({
    completionText: format(completionText),
    listItemText: format(listItemText),
    description: format(description ?? ``),
  }));

  const maxCompletionTextLength = Math.max(format(COMPLETION_TEXT).length, ...prettyResults.map(({completionText}) => completionText.length));
  const maxListItemTextLength = Math.max(format(LIST_ITEM_TEXT).length, ...prettyResults.map(({listItemText}) => listItemText.length));
  const maxDescriptionTextLength = Math.max(format(DESCRIPTION).length, ...prettyResults.map(({description}) => description?.length ?? 0));

  console.log(`| ${padText(COMPLETION_TEXT, maxCompletionTextLength)} | ${padText(LIST_ITEM_TEXT, maxListItemTextLength)} | ${padText(DESCRIPTION, maxDescriptionTextLength)} |`);
  console.log(`| ${repeatText(`-`, maxCompletionTextLength)} | ${repeatText(`-`, maxListItemTextLength)} | ${repeatText(`-`, maxDescriptionTextLength)} |`);

  for (const result of prettyResults) {
    console.log(`| ${result.completionText.padEnd(maxCompletionTextLength)} | ${result.listItemText.padEnd(maxListItemTextLength)} | ${(result.description ?? ``).padEnd(maxDescriptionTextLength)} |`);
  }
}
