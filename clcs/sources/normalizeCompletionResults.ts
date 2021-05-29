import type {CompletionResult, ShellCompletionResult, SingleOrArray} from './types';

/**
 * Normalizes and deduplicates completion results into an array of shell completion results.
 */
export function normalizeCompletionResults(
  results: SingleOrArray<CompletionResult>,
): Array<ShellCompletionResult> {
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

  return richResults;
}
