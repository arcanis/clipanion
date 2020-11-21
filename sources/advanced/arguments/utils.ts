import { BaseContext, CliContext,  } from '../Cli';
import {CommandBuilder,  RunState} from '../../core';
import { UsageError } from '../../errors';
import { Coercion, StrictValidator } from 'typanion';

export const isOptionSymbol = Symbol(`clipanion/isOption`);

export type GeneralFlags = {
  description?: string,
  hidden?: boolean,
};

export type CommandOption<T> = {
    [isOptionSymbol]: true,
    definition: <Context extends BaseContext>(builder: CommandBuilder<CliContext<Context>>, key: string) => void,
    transformer: <Context extends BaseContext>(builder: CommandBuilder<CliContext<Context>>, key: string, state: RunState) => T,
};

export type CommandOptionReturn<T> = T;

export function makeCommandOption<T>(spec: Omit<CommandOption<T>, typeof isOptionSymbol>) {
    // We lie! But it's for the good cause: the cli engine will turn the specs into proper values after instantiation.
    return {...spec, [isOptionSymbol]: true} as any as CommandOptionReturn<T>;
}

export function rerouteArguments<A, B>(a: A | B, b: B): [Exclude<A, B>, B];
export function rerouteArguments<A, B>(a: A | B | undefined, b: B): [Exclude<A, B> | undefined, B];
export function rerouteArguments<A, B>(a: A | B | undefined, b: B): [Exclude<A, B>, B] {
    if (typeof a === `undefined`)
        return [a, b] as any;

    if (typeof a === `object` && a !== null && !Array.isArray(a)) {
        return [undefined, a as B] as any;
    } else {
        return [a, b] as any;
    }
}

export function cleanValidationError(message: string, lowerCase: boolean = false) {
    let cleaned = message.replace(/^\.: /, ``);

    if (lowerCase)
        cleaned = cleaned[0].toLowerCase() + cleaned.slice(1);

    return cleaned;
}

export function formatError(message: string, errors: string[]) {
    if (errors.length === 1) {
        return new UsageError(`${message}: ${cleanValidationError(errors[0], true)}`)
    } else {
        return new UsageError(`${message}:\n${errors.map(error => `\n- ${cleanValidationError(error)}`).join(``)}`)
    }
}

export function applyValidator<U, V>(name: string, value: U, validator?: StrictValidator<unknown, V>) {
  if (typeof validator === `undefined`)
      return value;

  const errors: string[] = [];
  const coercions: Coercion[] = [];

  const check = validator(value, {errors, coercions, coercion: v => { value = v; }});
  if (!check) 
      throw formatError(`Invalid option validation for ${name}`, errors);

  for (const [, op] of coercions)
      op();

  return value;
}