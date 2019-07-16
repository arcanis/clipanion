export type ParseEntry =
    | {type: `positional`, value: string}
    | {type: `option`, name: string, value: any}
    | {type: `error`, reason: string}
    | {type: `patch`, value: any};

export const builders = {
    generatePositional(segment: string): ParseEntry {
        return {type: `positional`, value: segment};
    },

    generateBoolean(segment: string): ParseEntry {
        return {type: `option`, name: segment, value: true};
    },

    generateStringKey(segment: string): ParseEntry {
        return {type: `option`, name: segment, value: undefined};
    },

    generateStringValue(segment: string): ParseEntry {
        return {type: `patch`, value: segment};
    },

    generateStringFromInline(segment: string): ParseEntry {
        const idx = segment.indexOf(`=`);
        return {type: `option`, name: segment.substr(0, idx), value: segment.substr(idx + 1)};
    },

    generateBooleansFromBatch(segment: string): ParseEntry[] {
        let results: ParseEntry[] = [];

        for (let t = 1; t < segment.length; ++t)
            results.push({type: `option`, name: `-${segment.charAt(t)}`, value: true});

        return results;
    },

    generateMissingPositionalArgument(): ParseEntry {
        return {type: `error`, reason: `Not enough positional arguments.`}
    },

    generateExtraneousPositionalArgument(segment: string): ParseEntry {
        return {type: `error`, reason: `Extraneous positional argument "${segment}".`}
    },

    generateUnsupportedOption(segment: string): ParseEntry {
        return {type: `error`, reason: `Unsupported option "${segment}".`};
    },
};
