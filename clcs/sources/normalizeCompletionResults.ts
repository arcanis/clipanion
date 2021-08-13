import type {CompletionResult, ShellCompletionResult, SingleOrArray} from './types';

/**
 * Normalizes and deduplicates completion results into an array of shell completion results.
 */
export function normalizeCompletionResults(
  results: SingleOrArray<CompletionResult>,
): Array<ShellCompletionResult> {
  if (!Array.isArray(results))
    results = [results];

  const shellCompletionResultHashes = new Set<string>();
  const shellCompletionResults = [];

  for (const result of results) {
    const richResult = typeof result === `string` ? {completionText: result} : result;

    // The property order has to be consistent
    const shellCompletionResult: ShellCompletionResult = {
      completionText: richResult.completionText,
      listItemText: richResult.listItemText ?? richResult.completionText,
      description: richResult.description,
    };

    const hash = JSON.stringify(shellCompletionResult);
    if (shellCompletionResultHashes.has(hash))
      continue;

    shellCompletionResults.push(shellCompletionResult);
    shellCompletionResultHashes.add(hash);
  }

  return shellCompletionResults;
}
