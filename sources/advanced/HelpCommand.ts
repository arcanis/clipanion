import type {RunState}                from '../core';

import type {BaseContext, CliContext} from './Cli';
import {Command}                      from './Command';

export class HelpCommand<Context extends BaseContext> extends Command<Context> {
  private commands: Array<number> = [];
  private index?: number;

  static from<Context extends BaseContext>(state: RunState, contexts: Array<CliContext<Context>>) {
    const command = new HelpCommand<Context>(contexts);
    command.path = state.path;

    for (const opt of state.options) {
      switch (opt.name) {
        case `-c`: {
          command.commands.push(Number(opt.value));
        } break;
        case `-i`: {
          command.index = Number(opt.value);
        } break;
      }
    }

    return command;
  }

  constructor(private readonly contexts: Array<CliContext<Context>>) {
    super();
  }

  async execute() {
    let commands = this.commands;
    if (typeof this.index !== `undefined` && this.index >= 0 && this.index < commands.length)
      commands = [commands[this.index]];

    if (commands.length === 0) {
      this.context.stdout.write(this.cli.usage());
    } else if (commands.length === 1) {
      this.context.stdout.write(this.cli.usage(this.contexts[commands[0]].commandClass, {detailed: true}));
    } else if (commands.length > 1) {
      this.context.stdout.write(`Multiple commands match your selection:\n`);
      this.context.stdout.write(`\n`);

      let index = 0;
      for (const command of this.commands)
        this.context.stdout.write(this.cli.usage(this.contexts[command].commandClass, {prefix: `${index++}. `.padStart(5)}));

      this.context.stdout.write(`\n`);
      this.context.stdout.write(`Run again with -h=<index> to see the longer details of any of those commands.\n`);
    }
  }
}
