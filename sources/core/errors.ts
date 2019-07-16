import {Definition}    from './Command';
import {prettyCommand} from './pretty';

export type ErrorMeta = {
    type: `none`;
} | {
    type: `usage`;
};

function getTokenName(name: string | null) {
    if (name === null) {
        return `<eol>`;
    } else {
        return `"${name}"`;
    }
}

export class UnknownSyntaxError extends Error {
    public clipanion: ErrorMeta = {type: `none`};

    constructor(public readonly definitions: [Definition, string | null][]) {
        super();

        this.name = `UnknownSyntaxError`;
        this.setBinaryName(undefined);
    }

    setBinaryName(binaryName: string | undefined) {
        if (this.definitions.length > 1) {
            this.message = `Command not found; did you mean one of:\n\n${this.definitions.map(([definition], index) => {
                return `  ${index}. ${prettyCommand(definition, {binaryName})}`;
            }).join(`\n`)}`;
        } else {
            const [[definition, reason]] = this.definitions;
            this.message = `${reason}\n\n$ ${prettyCommand(definition, {binaryName})}`;
        }
    }
}

export class AmbiguousSyntaxError extends Error {
    public clipanion: ErrorMeta = {type: `none`};

    constructor(public readonly definitions: Definition[]) {
        super();

        this.name = `AmbiguousSyntaxError`;
        this.setBinaryName(undefined);
    }

    setBinaryName(binaryName: string | undefined) {
        this.message = `Cannot find who to pick amongst the following alternatives:\n\n${this.definitions.map((definition, index) => {
            return `  ${index}. ${prettyCommand(definition, {binaryName})}`;
        }).join(`\n`)}`;
    }
}