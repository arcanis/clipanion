import {debugCompletionRequest} from 'clcs';

import {Command}                from '../../Command';
import * as Option              from '../../options';
import {BuiltinOptions}         from '../utils';

/**
 * A command that measures the performance of processing and answering completion requests and pretty-prints the completion results to stdout.
 *
 * Default Paths: `completion debug`
 */
export function CompletionDebugCommand({paths = [[`completion`, `debug`]]}: BuiltinOptions = {}) {
  return class CompletionDebugCommand extends Command<any> {
    static paths = paths;

    input = Option.String();

    async execute() {
      return await debugCompletionRequest({
        input: this.input,
        stdout: this.context.stdout,
        stderr: this.context.stderr,
      }, request => {
        return this.cli.complete(request);
      });
    }
  };
}
