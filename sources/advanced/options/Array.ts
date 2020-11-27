import { GeneralFlags, CommandOptionReturn, rerouteArguments, makeCommandOption } from "./utils";

export type ArrayFlags = GeneralFlags & {
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
export function Array(descriptor: string, opts?: ArrayFlags): CommandOptionReturn<string[] | undefined>;
export function Array(descriptor: string, initialValue: string[], opts?: ArrayFlags): CommandOptionReturn<string[]>;
export function Array(descriptor: string, initialValueBase: ArrayFlags | string[] | undefined, optsBase?: ArrayFlags) {
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
        }
    });
}