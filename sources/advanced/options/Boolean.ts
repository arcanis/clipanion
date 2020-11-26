import { CommandOptionReturn, GeneralFlags, makeCommandOption, rerouteArguments } from "./utils";

export type BooleanFlags = GeneralFlags;

/**
 * Used to annotate boolean options.
 * 
 * @example
 * --foo --no-bar
 *     ► {"foo": true, "bar": false}
 */
export function Boolean(descriptor: string, opts?: BooleanFlags): CommandOptionReturn<boolean | undefined>;
export function Boolean(descriptor: string, initialValue: boolean, opts?: BooleanFlags): CommandOptionReturn<boolean>;
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
        }
    });
}