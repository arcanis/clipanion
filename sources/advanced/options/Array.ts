import {GeneralOptionFlags, CommandOptionReturn, rerouteArguments, makeCommandOption} from "./utils";

export type ArrayFlags = GeneralOptionFlags & {
  arity?: number,
};

/**
 * Used to annotate array options. Such options will be strings unless they
 * are provided a schema, which will then be used for coercion.
 *
 * @example
 * --foo hello --foo bar
 *     ► {"foo": ["hello", "world"]}
 */
export function Array(descriptor: string, opts: ArrayFlags & {required: true}): CommandOptionReturn<Array<string>>;
export function Array(descriptor: string, opts?: ArrayFlags): CommandOptionReturn<Array<string> | undefined>;
export function Array(descriptor: string, initialValue: Array<string>, opts?: Omit<ArrayFlags, 'required'>): CommandOptionReturn<Array<string>>;
export function Array(descriptor: string, initialValueBase: ArrayFlags | Array<string> | undefined, optsBase?: ArrayFlags) {
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
