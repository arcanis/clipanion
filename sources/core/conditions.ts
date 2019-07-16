import {Definition, HELP_OPTIONS} from './Command';

export const OPTION_REGEXP = /^(-[a-z]|--[a-z]+(-[a-z]+)*)(=.*)?$/;
export const BATCH_REGEXP = /^-[a-z0-9]{2,}$/;

export const conditions = {
    isPositionalArgument(segment: string) {
        return !segment.startsWith(`-`);
    },

    always() {
        return true;
    },

    isOptionLike(segment: string) {
        return OPTION_REGEXP.test(segment);
    },

    isNotHelpNorSeparator(segment: string) {
        return !HELP_OPTIONS.has(segment) && segment !== `--`;
    },

    isOptionLikeButNotHelp(segment: string) {
        return OPTION_REGEXP.test(segment) && !HELP_OPTIONS.has(segment);
    },

    isOptionBatch(segment: string, definition: Definition) {
        if (!BATCH_REGEXP.test(segment))
            return false;
    
        for (let t = 1; t < segment.length; ++t)
            if (!definition.options.simple.has(`-${segment.charAt(t)}`))
                return false;
    
        return true;
    },

    isUnsupportedOption(segment: string, definition: Definition) {
        if (!OPTION_REGEXP.test(segment))
            return false;
    
        const idx = segment.indexOf(`=`);
        const name = idx === -1 ? segment : segment.substr(0, idx);
    
        return !definition.options.simple.has(name) && !definition.options.complex.has(name);
    },

    isInlineOption(segment: string, definition: Definition) {
        if (!OPTION_REGEXP.test(segment))
            return false;
    
        const idx = segment.indexOf(`=`);
        if (idx === -1)
            return false;
    
        const name = segment.substr(0, idx);
        if (!definition.options.simple.has(name) && !definition.options.complex.has(name))
            return false;
    
        return true;
    }
};
