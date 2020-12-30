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
  booleanWithRequired = Option.Boolean(`--foo`, {required: true});
  // @ts-expect-error: Overload prevents this
  booleanWithRequiredAndDefault = Option.Boolean(`--foo`, false, {required: true});

  string = Option.String(`--foo`);
  stringWithDefault = Option.String(`--foo`, false);
  stringWithValidator = Option.String(`--foo`, {validator: t.isNumber()});
  stringWithValidatorAndDefault = Option.String(`--foo`, `0`, {validator: t.isNumber()});
  stringWithTolerateBoolean = Option.String(`--foo`, {tolerateBoolean: true});
  stringWithTolerateBooleanAndDefault = Option.String(`--foo`, false, {tolerateBoolean: true});
  stringWithRequired = Option.String(`--foo`, {required: true});
  stringWithTolerateBooleanAndRequired = Option.String(`--foo`, {tolerateBoolean: true, required: true});
  // @ts-expect-error: Overload prevents this
  stringWithRequiredAndDefault = Option.String(`--foo`, false, {required: true});
  // @ts-expect-error: Overload prevents this
  stringWithTolerateBooleanAndRequiredAndDefault = Option.String(`--foo`, false, {tolerateBoolean: true, required: true});

  counter = Option.Counter(`--foo`);
  counterWithDefault = Option.Counter(`--foo`, 0);
  counterWithRequired = Option.Counter(`--foo`, {required: true});
  // @ts-expect-error: Overload prevents this
  counterWithRequiredAndDefault = Option.Counter(`--foo`, 0, {required: true});

  array = Option.Array(`--foo`);
  arrayWithDefault = Option.Array(`--foo`, []);
  arrayWithRequired = Option.Array(`--foo`, {required: true});
  // @ts-expect-error: Overload prevents this
  arrayWithRequiredAndDefault = Option.Array(`--foo`, [], {required: true});

  rest = Option.Rest();
  proxy = Option.Proxy();

  async execute() {
    assertEqual<string>()(this.requiredPositional, true);
    assertEqual<string | undefined>()(this.optionalPositional, true);

    assertEqual<boolean | undefined>()(this.boolean, true);
    assertEqual<boolean>()(this.booleanWithDefault, true);
    assertEqual<boolean>()(this.booleanWithRequired, true);

    assertEqual<string | undefined>()(this.string, true);
    assertEqual<string | undefined>()(this.string, true);
    assertEqual<string | boolean>()(this.stringWithDefault, true);
    assertEqual<string | boolean>()(this.stringWithDefault, true);
    assertEqual<number | undefined>()(this.stringWithValidator, true);
    assertEqual<number>()(this.stringWithValidatorAndDefault, true);
    assertEqual<string | boolean | undefined>()(this.stringWithTolerateBoolean, true);
    assertEqual<string | boolean>()(this.stringWithTolerateBooleanAndDefault, true);
    assertEqual<string>()(this.stringWithRequired, true);
    assertEqual<string | boolean>()(this.stringWithTolerateBooleanAndRequired, true);

    assertEqual<number | undefined>()(this.counter, true);
    assertEqual<number>()(this.counterWithDefault, true);
    assertEqual<number>()(this.counterWithRequired, true);

    assertEqual<Array<string> | undefined>()(this.array, true);
    assertEqual<Array<string>>()(this.arrayWithDefault, true);
    assertEqual<Array<string>>()(this.arrayWithRequired, true);

    assertEqual<Array<string>>()(this.rest, true);
    assertEqual<Array<string>>()(this.proxy, true);
  }
}
