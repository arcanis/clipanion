import {StrictValidator}                                                                                         from "typanion";

import {applyValidator, GeneralOptionFlags, CommandOptionReturn, rerouteArguments, makeCommandOption, WithArity} from "./utils";

export type ArrayFlags<T, Arity extends number = 1> = GeneralOptionFlags & {
  arity?: Arity,
  validator?: StrictValidator<unknown, Array<T>>,
};

/**
 * Used to annotate array options. Such options will be strings unless they
 * are provided a schema, which will then be used for coercion.
 *
 * @example
 * --foo hello --foo bar
 *     ► {"foo": ["hello", "world"]}
 */
export function Array<T extends {length?: number} = string, Arity extends number = 1>(descriptor: string, opts: ArrayFlags<T, Arity> & {required: true}): CommandOptionReturn<Array<WithArity<T, Arity>>>;
export function Array<T extends {length?: number} = string, Arity extends number = 1>(descriptor: string, opts?: ArrayFlags<T, Arity>): CommandOptionReturn<Array<WithArity<T, Arity>> | undefined>;
export function Array<T extends {length?: number} = string, Arity extends number = 1>(descriptor: string, initialValue: Array<WithArity<string, Arity>>, opts?: Omit<ArrayFlags<T, Arity>, 'required'>): CommandOptionReturn<Array<WithArity<T, Arity>>>;
export function Array<T = string, Arity extends number = 1>(descriptor: string, initialValueBase: ArrayFlags<T, Arity> | Array<WithArity<string, Arity>> | undefined, optsBase?: ArrayFlags<T, Arity>) {
  const [initialValue, opts] = rerouteArguments(initialValueBase, optsBase ?? {});
  const {arity = 1} = opts;

  const optNames = descriptor.split(`,`);
  const nameSet = new Set(optNames);

  return makeCommandOption({
    definition(builder) {
      builder.addOption({
        names: optNames,

        arity,

        hidden: opts?.hidden,
        description: opts?.description,
        required: opts.required,
      });
    },

    transformer(builder, key, state) {
      let usedName;
      let currentValue = typeof initialValue !== `undefined`
        ? [...initialValue]
        : undefined;

      for (const {name, value} of state.options) {
        if (!nameSet.has(name))
          continue;

        usedName = name;
        currentValue = currentValue ?? [];
        currentValue.push(value);
      }

      if (typeof currentValue !== `undefined`) {
        return applyValidator(usedName ?? key, currentValue, opts.validator);
      } else {
        return currentValue;
      }
    },
  });
}
