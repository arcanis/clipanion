export {Command} from './Command';

export {BaseContext, Cli, RunContext, CliOptions} from './Cli';
export {CommandClass, Usage, Definition} from './Command';

export {UsageError, ErrorMeta, ErrorWithMeta} from '../errors';
export {formatMarkdownish, ColorFormat} from '../format';

export {run, runExit} from './Cli';

export * as Builtins from './builtins';
export * as Option from './options';

/**
 * This function is never called; its only purpose is to provide import
 * statements for both the browser and node branches. Without that, Rollup
 * would only generate the node branch in its output.
 *
 * @internal
 */
export async function loadPlatform() {
  await import(`../platform/browser`);
  await import(`../platform/node`);
}

