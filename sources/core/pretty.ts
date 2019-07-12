import chalk        from 'chalk';

import {Definition} from './Command';

export function prettyCommand(definition: Definition, {binaryName}: {binaryName?: string} = {}) {
    const segments = [...definition.path];

    if (typeof binaryName !== `undefined`)
        segments.unshift(binaryName);

    for (const opt of definition.options.simple)
        segments.push(`[${opt}]`);

    for (const opt of definition.options.complex)
        segments.push(`[${opt} ARG]`);

    for (let t = 0; t < definition.positionals.minimum; ++t)
        segments.push(`<arg #${t}>`);

    if (definition.positionals.maximum === Infinity) {
        segments.push(`[...]`);
    } else {
        for (let t = definition.positionals.minimum; t < definition.positionals.maximum; ++t) {
            segments.push(`[arg #${t}]`);
        }
    }

    return segments.join(` `);
}

export function prettyMarkdownish(text: string, paragraphs: boolean) {
    // Enforce \n as newline character
    text = text.replace(/\r\n?/g, `\n`);

    // Remove the indentation, since it got messed up with the JS indentation
    text = text.replace(/^[\t ]+|[\t ]+$/gm, ``);

    // Remove surrounding newlines, since they got added for JS formatting
    text = text.replace(/^\n+|\n+$/g, ``);

    // Single newlines are removed; larger than that are collapsed into one
    text = text.replace(/\n(\n)?\n*/g, `$1`);

    if (paragraphs) {
        text = text.split(/\n/).map(function (paragraph) {
            // Does the paragraph starts with a bullet?
            let bulletMatch = paragraph.match(/^[*-][\t ]+(.*)/);

            if (!bulletMatch)
                // No, cut the paragraphs into segments of 80 characters
                return paragraph.match(/(.{1,80})(?: |$)/g)!.join('\n');

            // Yes, cut the paragraphs into segments of 78 characters (to account for the prefix)
            return bulletMatch[1].match(/(.{1,78})(?: |$)/g)!.map((line, index) => {
                return (index === 0 ? `- ` : `  `) + line;
            }).join(`\n`);
        }).join(`\n\n`);
    }

    // Highlight the code segments
    text = text.replace(/(`+)((?:.|[\n])*?)\1/g, function ($0, $1, $2) {
        return chalk.cyan($1 + $2 + $1);
    });

    return text ? text + `\n` : ``;

}
