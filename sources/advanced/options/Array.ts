import {GeneralOptionFlags, CommandOptionReturn, rerouteArguments, makeCommandOption, WithArity, CompletionFunction} from "./utils";

export type ArrayFlags<Arity extends number = number> = GeneralOptionFlags & {
  arity?: Arity,
  completion?: CompletionFunction | Exclude<WithArity<CompletionFunction, Arity>, boolean>,
};

/**
 * Used to annotate array options. Such options will be strings unless they
 * are provided a schema, which will then be used for coercion.
 *
 * @example
 * --foo hello --foo bar
 *     ► {"foo": ["hello", "world"]}
 */
export function Array<Arity extends number = 1>(descriptor: string, opts: ArrayFlags<Arity> & {required: true}): CommandOptionReturn<Array<WithArity<string, Arity>>, true>;
export function Array<Arity extends number = 1>(descriptor: string, opts?: ArrayFlags<Arity>): CommandOptionReturn<Array<WithArity<string, Arity>> | undefined>;
export function Array<Arity extends number = 1>(descriptor: string, initialValue: Array<WithArity<string, Arity>>, opts?: Omit<ArrayFlags<Arity>, 'required'>): CommandOptionReturn<Array<WithArity<string, Arity>>>;
export function Array<Arity extends number = 1>(descriptor: string, initialValueBase: ArrayFlags<Arity> | Array<WithArity<string, Arity>> | undefined, optsBase?: ArrayFlags<Arity>) {
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

        completion: opts.completion,
      });
    },

    transformer(builder, key, state) {
      let currentValue = typeof initialValue !== `undefined`
        ? [...initialValue]
        : undefined;

      for (const {name, value} of state.options) {
        if (!nameSet.has(name))
          continue;

        currentValue = currentValue ?? [];
        currentValue.push(value);
      }

      return currentValue;
    },
  });
}
