export interface ColorFormat {
  header(str: string): string;
  bold(str: string): string;
  error(str: string): string;
  code(str: string): string;
}

const MAX_LINE_LENGTH = 80;
const richLine = Array(MAX_LINE_LENGTH).fill(`━`);
for (let t = 0; t <= 24; ++t)
  richLine[richLine.length - t] = `\x1b[38;5;${232 + t}m━`;

export const richFormat: ColorFormat = {
  header: str => `\x1b[1m━━━ ${str}${str.length < MAX_LINE_LENGTH - 5 ? ` ${richLine.slice(str.length + 5).join(``)}` : `:`}\x1b[0m`,
  bold: str => `\x1b[1m${str}\x1b[22m`,
  error: str => `\x1b[31m\x1b[1m${str}\x1b[22m\x1b[39m`,
  code: str => `\x1b[36m${str}\x1b[39m`,
};

export const textFormat: ColorFormat = {
  header: str => str,
  bold: str => str,
  error: str => str,
  code: str => str,
};

export function formatMarkdownish(text: string, {format, paragraphs}: {format: ColorFormat, paragraphs: boolean}) {
  // Enforce \n as newline character
  text = text.replace(/\r\n?/g, `\n`);

  // Remove the indentation, since it got messed up with the JS indentation
  text = text.replace(/^[\t ]+|[\t ]+$/gm, ``);

  // Remove surrounding newlines, since they got added for JS formatting
  text = text.replace(/^\n+|\n+$/g, ``);

  // List items always end with at least two newlines (in order to not be collapsed)
  text = text.replace(/^-([^\n]*?)\n+/gm, `-$1\n\n`);

  // Single newlines are removed; larger than that are collapsed into one
  text = text.replace(/\n(\n)?\n*/g, `$1`);

  if (paragraphs) {
    text = text.split(/\n/).map(paragraph => {
      // Does the paragraph starts with a list?
      const bulletMatch = paragraph.match(/^[*-][\t ]+(.*)/);

      if (!bulletMatch)
      // No, cut the paragraphs into segments of 80 characters
        return paragraph.match(/(.{1,80})(?: |$)/g)!.join(`\n`);

      // Yes, cut the paragraphs into segments of 78 characters (to account for the prefix)
      return bulletMatch[1].match(/(.{1,78})(?: |$)/g)!.map((line, index) => {
        return (index === 0 ? `- ` : `  `) + line;
      }).join(`\n`);
    }).join(`\n\n`);
  }

  // Highlight the code segments
  text = text.replace(/(`+)((?:.|[\n])*?)\1/g, ($0, $1, $2) => {
    return format.code($1 + $2 + $1);
  });

  // Highlight the code segments
  text = text.replace(/(\*\*)((?:.|[\n])*?)\1/g, ($0, $1, $2) => {
    return format.bold($1 + $2 + $1);
  });

  return text ? `${text}\n` : ``;
}
