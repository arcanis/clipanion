import {ParseEntry} from './builders';

export const DEBUG = process.env.DEBUG === `1`;

export function deepMerge<T extends any>(target: T, ...sources: ({[key: string]: any})[]) {
    for (const source of sources) {
        for (const key of Object.keys(source)) {
            const value = source[key];

            if (typeof value === `object` && value !== null && value.constructor === Object) {
                target[key] = deepMerge(target[key] || {}, value);
            } else {
                target[key] = value;
            }
        }
    }

    return target;
}

export type Parsed = {
    options: {name: string, value: any}[];
    positionals: string[];
};

export function reconciliateValues(sources: ParseEntry[]) {
    const result: Parsed = {
        options: [],
        positionals: [],
    };

    for (const source of sources) {
        switch (source.type) {
            case `positional`: {
                result.positionals.push(source.value);
            } break;

            case `option`: {
                result.options.push(source);
            } break;

            case `patch`: {
                result.options[result.options.length - 1].value = source.value;
            } break;
        }
    }

    return result;
}
