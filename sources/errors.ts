export type ErrorMeta = {
    type: `none`;
} | {
    type: `usage`;
};

export class UsageError extends Error {
    public clipanion: ErrorMeta = {type: `usage`};

    constructor(message: string) {
        super(message);
        this.name = `UsageError`;
    }
}

export class UnknownSyntaxError extends Error {
    public clipanion: ErrorMeta = {type: `none`};

    constructor(public readonly candidates: {usage: string, reason: string | null}[]) {
        super();
        this.name = `UnknownSyntaxError`;

        if (this.candidates.length === 0) {
            this.message = `Command not found, but we're not sure what's the alternative.`;
        } else if (this.candidates.length === 1) {
            const [{usage, reason}] = this.candidates;
            this.message = `${reason}\n\n$ ${usage}`;
        } else {
            this.message = `Command not found; did you mean one of:\n\n${this.candidates.map(({usage}, index) => {
                return `${`${index}.`.padStart(4)} ${usage}`;
            }).join(`\n`)}`;
        }
    }
}

export class AmbiguousSyntaxError extends Error {
    public clipanion: ErrorMeta = {type: `none`};

    constructor(public readonly usages: string[]) {
        super();
        this.name = `AmbiguousSyntaxError`;

        this.message = `Cannot find who to pick amongst the following alternatives:\n\n${this.usages.map((usage, index) => {
            return `${`${index}.`.padStart(4)} ${usage}`;
        }).join(`\n`)}`;
    }
}