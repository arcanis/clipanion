import {Definition}    from './Command';
import {prettyCommand} from './pretty';

export type ErrorMeta = {
    type: `none`;
} | {
    type: `usage`;
};


export class AmbiguousSyntaxError extends Error {
    public clipanion: ErrorMeta = {type: `none`};

    constructor(public readonly definitions: Definition[]) {
        super();

        this.name = `AmbiguousSyntaxError`;
        this.setBinaryName(undefined);
    }

    setBinaryName(binaryName: string | undefined) {
        this.message = `Cannot find who to pick amongst the following alternatives:\n${this.definitions.map((definition, index) => {
            return `${index}. ${prettyCommand(definition, {binaryName})}`;
        }).join(`\n`)}`;
    }
}