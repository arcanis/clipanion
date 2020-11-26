import { makeCommandOption } from "./utils";
import { NoLimits, } from '../../core';

export type RestFlags = {
  name?: string,
  required?: number,
};

/**
 * Used to annotate that the command supports any number of positional
 * arguments.
 * 
 * Be careful: this function is order-dependent! Make sure to define it
 * after any positional argument you want to declare.
 * 
 * This function is mutually exclusive with Command.Proxy.
 * 
 * @example
 * yarn add hello world
 *     ► rest = ["hello", "world"]
 */
export function Rest(opts: RestFlags = {}) {
    return makeCommandOption({
        definition(builder, key) {
            builder.addRest({
                name: opts.name ?? key,
                required: opts.required,
            });
        },

        transformer(builder, key, state) {
            // The builder's arity.extra will always be NoLimits,
            // because it is set when we call registerDefinition

            const isRestPositional = (index: number) => {
                const positional = state.positionals[index];

                // A NoLimits extra (i.e. an optional rest argument)
                if (positional.extra === NoLimits)
                    return true;

                // A leading positional (i.e. a required rest argument)
                if (positional.extra === false && index < builder.arity.leading.length)
                    return true;

                return false;
            };

            let count = 0;
            while (count < state.positionals.length && isRestPositional(count))
                count += 1;

            return state.positionals.splice(0, count).map(({value}) => value);
        }
    });
}