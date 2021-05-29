import {debugCompletionRequest} from 'clcs';

import {Command}                from '../../Command';
import * as Option              from '../../options';

export class CompletionDebugCommand extends Command<any> {
  static paths = [[`completion`, `debug`]];

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
}
