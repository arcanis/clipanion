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
      stderr: this.context.stderr,
    }, request => {
      return this.cli.complete(request);
    });
  }

  // By default, Clipanion writes everything to stdout so errors can't be filtered out.
  // This command is invoked by the shell which shouldn't suggest errors as completions,
  // so we write them to stderr and filter it out in `clcs`.
  async catch(error: any) {
    this.context.stderr.write(this.cli.error(error, {command: this}));
  }
}
