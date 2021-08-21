import {Command, Option} from 'clipanion';

export class FooCommand extends Command {
  static paths = [[`foo`]]

  number = Option.String(`--number`, {completion: () => [`3`, `1`, `4`, `2`]});

  async execute() {}
}
