/* eslint-disable @typescript-eslint/no-unused-vars */
import * as t            from 'typanion';

import {Command, Option} from '..';

type AssertEqual<T, Expected> = [T, Expected] extends [Expected, T] ? true : false;

function assertEqual<U>() {
  return <V>(val: V, expected: AssertEqual<U, V>) => {};
}

class MyCommand extends Command {
  requiredPositional = Option.String();
  optionalPositional = Option.String({required: false});

  boolean = Option.Boolean(`--foo`);
  booleanWithDefault = Option.Boolean(`--foo`, false);

  string = Option.String(`--foo`);
  stringWithDefault = Option.String(`--foo`, false);
  stringWithValidator = Option.String(`--foo`, {validator: t.isNumber()});
  stringWithValidatorAndDefault = Option.String(`--foo`, `0`, {validator: t.isNumber()});

  counter = Option.Counter(`--foo`);
  counterWithDefault = Option.Counter(`--foo`, 0);

  array = Option.Array(`--foo`);
  arrayWithDefault = Option.Array(`--foo`, []);

  rest = Option.Rest();
  proxy = Option.Proxy();

  async execute() {
    assertEqual<string>()(this.requiredPositional, true);
    assertEqual<string | undefined>()(this.optionalPositional, true);

    assertEqual<boolean | undefined>()(this.boolean, true);
    assertEqual<boolean>()(this.booleanWithDefault, true);

    assertEqual<string | undefined>()(this.string, true);
    assertEqual<string | undefined>()(this.string, true);
    assertEqual<string | boolean>()(this.stringWithDefault, true);
    assertEqual<string | boolean>()(this.stringWithDefault, true);
    assertEqual<number | undefined>()(this.stringWithValidator, true);
    assertEqual<number>()(this.stringWithValidatorAndDefault, true);

    assertEqual<number | undefined>()(this.counter, true);
    assertEqual<number>()(this.counterWithDefault, true);

    assertEqual<Array<string>>()(this.rest, true);
    assertEqual<Array<string>>()(this.proxy, true);
  }
}
