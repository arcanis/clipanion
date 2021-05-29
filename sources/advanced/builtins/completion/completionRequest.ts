import {processCompletionRequest} from 'clcs';

import {Command}                  from '../../Command';
import * as Option                from '../../options';

export class CompletionRequestCommand extends Command<any> {
  static paths = [[`completion`, `request`]];

  shellName = Option.String();

  input = Option.String();

  cursorPosition = Option.String();

  async execute() {
    return await processCompletionRequest({
      shellName: this.shellName,
      input: this.input,
      cursorPosition: this.cursorPosition,
      stdout: this.context.stdout,
    }, request => {
      return this.cli.complete(request);
    });
  }
}
