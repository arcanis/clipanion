import {CommandOptionReturn, GeneralFlags, makeCommandOption, rerouteArguments} from "./utils";

export type CounterFlags = GeneralFlags;

/**
 * Used to annotate options whose repeated values are aggregated into a
 * single number.
 *
 * @example
 * -vvvvv
 *     ► {"v": 5}
 */
export function Counter(descriptor: string, opts?: CounterFlags): CommandOptionReturn<number | undefined>;
export function Counter(descriptor: string, initialValue: number, opts?: CounterFlags): CommandOptionReturn<number>;
export function Counter(descriptor: string, initialValueBase: CounterFlags | number | undefined, optsBase?: CounterFlags) {
  const [initialValue, opts] = rerouteArguments(initialValueBase, optsBase ?? {});

  const optNames = descriptor.split(`,`);
  const nameSet = new Set(optNames);

  return makeCommandOption({
    definition(builder) {
      builder.addOption({
        names: optNames,

        allowBinding: false,
        arity: 0,

        hidden: opts.hidden,
        description: opts.description,
      });
    },

    transformer(builder, key, state) {
      let currentValue = initialValue;

      for (const {name, value} of state.options) {
        if (!nameSet.has(name))
          continue;

        currentValue ??= 0;

        // Negated options reset the counter
        if (!value) {
          currentValue = 0;
        } else {
          currentValue += 1;
        }
      }

      return currentValue;
    },
  });
}
