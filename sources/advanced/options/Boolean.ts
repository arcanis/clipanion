import type {CommandOptionReturn, GeneralOptionFlags} from "./utils";
import {makeCommandOption, rerouteArguments}          from "./utils";

export type BooleanFlags = GeneralOptionFlags;

/**
 * Used to annotate boolean options.
 *
 * @example
 * --foo --no-bar
 *     ► {"foo": true, "bar": false}
 */
export function Boolean(descriptor: string, opts: BooleanFlags & {required: true}): CommandOptionReturn<boolean>;
export function Boolean(descriptor: string, opts?: BooleanFlags): CommandOptionReturn<boolean | undefined>;
export function Boolean(descriptor: string, initialValue: boolean, opts?: Omit<BooleanFlags, 'required'>): CommandOptionReturn<boolean>;
export function Boolean(descriptor: string, initialValueBase: BooleanFlags | boolean | undefined, optsBase?: BooleanFlags) {
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
        required: opts.required,
      });
    },

    transformer(builer, key, state) {
      let currentValue = initialValue;

      for (const {name, value} of state.options) {
        if (!nameSet.has(name))
          continue;

        currentValue = value;
      }

      return currentValue;
    },
  });
}
