/* eslint-disable @typescript-eslint/no-unused-vars */
import * as t            from 'typanion';

import {PartialCommand}  from '../sources/advanced/options';
import {Command, Option} from '..';

type AssertEqual<T, Expected> = [T, Expected] extends [Expected, T] ? true : false;

function assertEqual<U>() {
  return <V>(val: V, expected: AssertEqual<Option.CommandOptionReturn<U, any>, V>) => {};
}

// IMPORTANT: Each `Command` assertion must have a matching `PartialCommand` assertion!

class MyCommand extends Command {
  defaultPositional = Option.String();
  requiredPositional = Option.String({required: true});
  optionalPositional = Option.String({required: false});

  boolean = Option.Boolean(`--foo`);
  booleanWithDefault = Option.Boolean(`--foo`, false);
  booleanWithRequired = Option.Boolean(`--foo`, {required: true});
  // @ts-expect-error: Overload prevents this
  booleanWithRequiredAndDefault = Option.Boolean(`--foo`, false, {required: true});

  string = Option.String(`--foo`);
  stringWithDefault = Option.String(`--foo`, `foo`);
  stringWithValidator = Option.String(`--foo`, {validator: t.isNumber()});
  stringWithValidatorAndDefault = Option.String(`--foo`, `0`, {validator: t.isNumber()});
  stringWithValidatorAndRequired = Option.String(`--foo`, {validator: t.isNumber(), required: true});
  stringWithRequired = Option.String(`--foo`, {required: true});
  // @ts-expect-error: Overload prevents this
  stringWithRequiredAndDefault = Option.String(`--foo`, false, {required: true});
  stringWithArityNumber = Option.String(`--foo`, {arity: 0 as number});
  stringWithArityNumberAndRequired = Option.String(`--foo`, {arity: 0 as number, required: true});
  stringWithArity0 = Option.String(`--foo`, {arity: 0});
  stringWithArity1 = Option.String(`--foo`, {arity: 1});
  stringWithArity2 = Option.String(`--foo`, {arity: 2});
  stringWithArity3 = Option.String(`--foo`, {arity: 3});
  stringWithArity3AndDefault = Option.String(`--foo`, [`bar`, `baz`, `qux`], {arity: 3});
  // @ts-expect-error: Overload prevents this
  stringWithArity3AndWrongDefault = Option.String(`--foo`, `bar`, {arity: 3});
  stringWithArity3AndValidator = Option.String(`--foo`, {arity: 3, validator: t.isNumber()});
  stringWithArity3AndValidatorAndDefault = Option.String(`--foo`, [`1`, `2`, `3`], {arity: 3, validator: t.isNumber()});
  stringWithArity3AndValidatorAndRequired = Option.String(`--foo`, {arity: 3, validator: t.isNumber(), required: true});
  stringWithArity3AndRequired = Option.String(`--foo`, {arity: 3, required: true});
  // @ts-expect-error: Overload prevents this
  stringWithArity3AndRequiredAndDefault = Option.String(`--foo`, [`bar`, `baz`, `qux`], {arity: 3, required: true});

  stringWithTolerateBoolean = Option.String(`--foo`, {tolerateBoolean: true});
  stringWithTolerateBooleanFalse = Option.String(`--foo`, {tolerateBoolean: false});
  stringWithTolerateBooleanAndRequired = Option.String(`--foo`, {tolerateBoolean: true, required: true});
  stringWithTolerateBooleanAndDefault = Option.String(`--foo`, false, {tolerateBoolean: true});
  stringWithTolerateBooleanAndValidator = Option.String(`--foo`, false, {tolerateBoolean: true, validator: t.isNumber()});
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
  arrayWithArity0 = Option.Array(`--foo`, {arity: 0});
  arrayWithArity1 = Option.Array(`--foo`, {arity: 1});
  arrayWithArity2 = Option.Array(`--foo`, {arity: 2});
  arrayWithArity3 = Option.Array(`--foo`, {arity: 3});
  arrayWithArity3AndDefault = Option.Array(`--foo`, [], {arity: 3});
  arrayWithArity3AndRequired = Option.Array(`--foo`, {arity: 3, required: true});
  // @ts-expect-error: Overload prevents this
  arrayWithArity3AndRequiredAndDefault = Option.Array(`--foo`, [], {arity: 3, required: true});

  rest = Option.Rest();
  proxy = Option.Proxy();

  async execute() {
    assertEqual<string>()(this.defaultPositional, true);
    assertEqual<string>()(this.requiredPositional, true);
    assertEqual<string | undefined>()(this.optionalPositional, true);

    assertEqual<boolean | undefined>()(this.boolean, true);
    assertEqual<boolean>()(this.booleanWithDefault, true);
    assertEqual<boolean>()(this.booleanWithRequired, true);

    assertEqual<string | undefined>()(this.string, true);
    assertEqual<string>()(this.stringWithDefault, true);
    assertEqual<number | undefined>()(this.stringWithValidator, true);
    assertEqual<number>()(this.stringWithValidatorAndRequired, true);
    assertEqual<number>()(this.stringWithValidatorAndDefault, true);
    assertEqual<string>()(this.stringWithRequired, true);
    assertEqual<Array<string> | boolean | string | undefined>()(this.stringWithArityNumber, true);
    assertEqual<Array<string> | boolean | string>()(this.stringWithArityNumberAndRequired, true);
    assertEqual<boolean | string | undefined>()(this.stringWithArity0, true);
    assertEqual<string | undefined>()(this.stringWithArity1, true);
    assertEqual<[string, string] | undefined>()(this.stringWithArity2, true);
    assertEqual<[string, string, string] | undefined>()(this.stringWithArity3, true);
    assertEqual<[string, string, string]>()(this.stringWithArity3AndDefault, true);
    assertEqual<[string, string, string]>()(this.stringWithArity3AndRequired, true);
    assertEqual<[number, number, number] | undefined>()(this.stringWithArity3AndValidator, true);
    assertEqual<[number, number, number]>()(this.stringWithArity3AndValidatorAndDefault, true);
    assertEqual<[number, number, number]>()(this.stringWithArity3AndValidatorAndRequired, true);

    assertEqual<string | undefined>()(this.stringWithTolerateBooleanFalse, true);
    assertEqual<string | boolean | undefined>()(this.stringWithTolerateBoolean, true);
    assertEqual<string | boolean>()(this.stringWithTolerateBooleanAndDefault, true);
    assertEqual<string | boolean>()(this.stringWithTolerateBooleanAndRequired, true);

    assertEqual<number | undefined>()(this.counter, true);
    assertEqual<number>()(this.counterWithDefault, true);
    assertEqual<number>()(this.counterWithRequired, true);

    assertEqual<Array<string> | undefined>()(this.array, true);
    assertEqual<Array<string>>()(this.arrayWithDefault, true);
    assertEqual<Array<string>>()(this.arrayWithRequired, true);
    assertEqual<Array<boolean | string> | undefined>()(this.arrayWithArity0, true);
    assertEqual<Array<string> | undefined>()(this.arrayWithArity1, true);
    assertEqual<Array<[string, string]> | undefined>()(this.arrayWithArity2, true);
    assertEqual<Array<[string, string, string]> | undefined>()(this.arrayWithArity3, true);
    assertEqual<Array<[string, string, string]>>()(this.arrayWithArity3AndDefault, true);
    assertEqual<Array<[string, string, string]>>()(this.arrayWithArity3AndRequired, true);

    assertEqual<Array<string>>()(this.rest, true);
    assertEqual<Array<string>>()(this.proxy, true);
  }
}

/* PartialCommand */

declare const partialCommand: PartialCommand<MyCommand>;

() => {
  assertEqual<string | undefined>()(partialCommand.defaultPositional, true);
  assertEqual<string | undefined>()(partialCommand.requiredPositional, true);
  assertEqual<string | undefined>()(partialCommand.optionalPositional, true);

  assertEqual<boolean | undefined>()(partialCommand.boolean, true);
  assertEqual<boolean>()(partialCommand.booleanWithDefault, true);
  assertEqual<boolean | undefined>()(partialCommand.booleanWithRequired, true);

  assertEqual<string | undefined>()(partialCommand.string, true);
  assertEqual<string>()(partialCommand.stringWithDefault, true);
  assertEqual<number | undefined>()(partialCommand.stringWithValidator, true);
  assertEqual<number | undefined>()(partialCommand.stringWithValidatorAndRequired, true);
  assertEqual<number>()(partialCommand.stringWithValidatorAndDefault, true);
  assertEqual<string | undefined>()(partialCommand.stringWithRequired, true) ;
  assertEqual<Array<string> | boolean | string | undefined>()(partialCommand.stringWithArityNumber, true);
  assertEqual<Array<string> | boolean | string | undefined>()(partialCommand.stringWithArityNumberAndRequired, true);
  assertEqual<boolean | string | undefined>()(partialCommand.stringWithArity0, true);
  assertEqual<string | undefined>()(partialCommand.stringWithArity1, true);
  assertEqual<[string, string?] | undefined>()(partialCommand.stringWithArity2, true);
  assertEqual<[string, string?, string?] | undefined>()(partialCommand.stringWithArity3, true);
  assertEqual<[string, string?, string?]>()(partialCommand.stringWithArity3AndDefault, true);
  assertEqual<[string, string?, string?] | undefined>()(partialCommand.stringWithArity3AndRequired, true);
  assertEqual<[number, number?, number?] | undefined>()(partialCommand.stringWithArity3AndValidator, true);
  assertEqual<[number, number?, number?]>()(partialCommand.stringWithArity3AndValidatorAndDefault, true);
  assertEqual<[number, number?, number?] | undefined>()(partialCommand.stringWithArity3AndValidatorAndRequired, true);

  assertEqual<string | undefined>()(partialCommand.stringWithTolerateBooleanFalse, true);
  assertEqual<string | boolean | undefined>()(partialCommand.stringWithTolerateBoolean, true);
  assertEqual<string | boolean>()(partialCommand.stringWithTolerateBooleanAndDefault, true);
  assertEqual<string | boolean | undefined>()(partialCommand.stringWithTolerateBooleanAndRequired, true);

  assertEqual<number | undefined>()(partialCommand.counter, true);
  assertEqual<number>()(partialCommand.counterWithDefault, true);
  assertEqual<number | undefined>()(partialCommand.counterWithRequired, true);

  assertEqual<Array<string> | undefined>()(partialCommand.array, true);
  assertEqual<Array<string>>()(partialCommand.arrayWithDefault, true);
  assertEqual<Array<string> | undefined>()(partialCommand.arrayWithRequired, true);
  assertEqual<Array<boolean | string> | undefined>()(partialCommand.arrayWithArity0, true);
  assertEqual<Array<string> | undefined>()(partialCommand.arrayWithArity1, true);
  assertEqual<[...Array<[string, string]>, [string, string?]] | undefined>()(partialCommand.arrayWithArity2, true);
  assertEqual<[...Array<[string, string, string]>, [string, string?, string?]] | undefined>()(partialCommand.arrayWithArity3, true);
  assertEqual<[...Array<[string, string, string]>, [string, string?, string?]]>()(partialCommand.arrayWithArity3AndDefault, true);
  assertEqual<[...Array<[string, string, string]>, [string, string?, string?]] | undefined>()(partialCommand.arrayWithArity3AndRequired, true);

  assertEqual<Array<string>>()(partialCommand.rest, true);
  assertEqual<Array<string>>()(partialCommand.proxy, true);
};
