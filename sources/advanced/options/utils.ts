import {CompletionResults, CompletionRequest}  from 'clcs';
import {Coercion, CoercionFn, StrictValidator} from 'typanion';

import {CommandBuilder,  RunState}             from '../../core';
import {UsageError}                            from '../../errors';
import {BaseContext, CliContext}               from '../Cli';
import {Command}                               from '../Command';

export const isOptionSymbol = Symbol(`clipanion/isOption`);

export type GeneralOptionFlags = {
  description?: string,
  hidden?: boolean,
  required?: boolean;
};

// https://stackoverflow.com/a/52490977

export type TupleOf<Type, Arity extends number, Accumulator extends Array<Type>> = Accumulator['length'] extends Arity
  ? Accumulator
  : TupleOf<Type, Arity, [Type, ...Accumulator]>;

export type Tuple<Type, Arity extends number> = Arity extends Arity
  ? number extends Arity
    ? Array<Type>
    : TupleOf<Type, Arity, []>
  : never;

export type WithArity<Type, Arity extends number> = Arity extends 0
  ? boolean | Type
  : Arity extends 1
    ? Type
    : number extends Arity
      ? boolean | Type | Tuple<Type, Arity>
      : Tuple<Type, Arity>;

export type CommandOption<T> = {
  [isOptionSymbol]: true,
  definition: <Context extends BaseContext>(builder: CommandBuilder<CliContext<Context>>, key: string) => void,
  transformer: <Context extends BaseContext>(builder: CommandBuilder<CliContext<Context>>, key: string, state: RunState) => T,
};

export type PartialTuple<T extends [any, ...Array<any>]> = T extends [infer Leading, ...infer Rest]
  ? [Leading, ...Partial<Rest>]
  : never;

export type PartialArrayOfTuples<T extends Array<[any, ...Array<any>]>> = T extends Array<infer U>
  ? U extends [any, ...Array<any>]
    ? [...Array<U>, PartialTuple<U>]
    : never
  : never;

type PartialReturn<T> = T extends [any, ...Array<any>]
  ? PartialTuple<T>
  : T extends Array<[any, ...Array<any>]>
    ? PartialArrayOfTuples<T>
    : T;

export type CommandOptionReturnTag<ForceOptional extends boolean> = {__isOption?: true, __forceOptional?: ForceOptional};
export type CommandOptionReturn<T, ForceOptional extends boolean = false> = undefined extends T
  ? Exclude<T, undefined> & CommandOptionReturnTag<ForceOptional> | undefined
  : T & CommandOptionReturnTag<ForceOptional>;

// Apparently TypeScript doesn't untag it unless we explicitly handle both cases
export type Untag<T> = T extends infer U & CommandOptionReturnTag<true> ? U
  : T extends infer U & CommandOptionReturnTag<false> ? U
    : T;

export type PartialCommand<T extends Command<any>> = {
  [P in keyof T]: Exclude<T[P], undefined> extends CommandOptionReturn<infer R, infer ForceOptional>
    ? ForceOptional extends true
      ? CommandOptionReturn<PartialReturn<Untag<R>> | undefined, ForceOptional>
      : undefined extends T[P]
        ? CommandOptionReturn<PartialReturn<Untag<R> | undefined>, ForceOptional>
        : CommandOptionReturn<PartialReturn<Untag<R>>, ForceOptional>
    : T[P];
};

/**
 * A completion function that returns completion results based on a completion request.
 *
 * @template T The type of the partial command.
 *
 * @param request The normalized completion request.
 * @param command The partial command populated with all cli arguments that can be parsed.
 */
export type CompletionFunction<T extends Command<any> = any> = (this: undefined, request: CompletionRequest, command: PartialCommand<T>) => CompletionResults;

export function makeCommandOption<T, ForceOptional extends boolean = boolean>(spec: Omit<CommandOption<T>, typeof isOptionSymbol>) {
  // We lie! But it's for the good cause: the cli engine will turn the specs into proper values after instantiation.
  return {...spec, [isOptionSymbol]: true} as any as CommandOptionReturn<T, ForceOptional>;
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

export function formatError(message: string, errors: Array<string>) {
  if (errors.length === 1) {
    return new UsageError(`${message}: ${cleanValidationError(errors[0], true)}`);
  } else {
    return new UsageError(`${message}:\n${errors.map(error => `\n- ${cleanValidationError(error)}`).join(``)}`);
  }
}

export function applyValidator<U, V>(name: string, value: U, validator?: StrictValidator<unknown, V>) {
  if (typeof validator === `undefined`)
    return value;

  const errors: Array<string> = [];
  const coercions: Array<Coercion> = [];

  const coercion: CoercionFn = (v: any) => {
    const orig = value;
    value = v;
    return coercion.bind(null, orig);
  };

  const check = validator(value, {errors, coercions, coercion});
  if (!check)
    throw formatError(`Invalid value for ${name}`, errors);

  for (const [, op] of coercions)
    op();

  return value;
}
