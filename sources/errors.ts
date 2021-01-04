import {END_OF_INPUT} from './constants';

export type ErrorMeta = {
  type: `none`;
} | {
  type: `usage`;
};

/**
 * A generic usage error with the name `UsageError`.
 *
 * It should be used over `Error` only when it's the user's fault.
 */
export class UsageError extends Error {
  public clipanion: ErrorMeta = {type: `usage`};

  constructor(message: string) {
    super(message);
    this.name = `UsageError`;
  }
}

export class UnknownSyntaxError extends Error {
  public clipanion: ErrorMeta = {type: `none`};

  constructor(public readonly input: Array<string>, public readonly candidates: Array<{usage: string, reason: string | null}>) {
    super();
    this.name = `UnknownSyntaxError`;

    if (this.candidates.length === 0) {
      this.message = `Command not found, but we're not sure what's the alternative.`;
    } else if (this.candidates.every(candidate => candidate.reason !== null && candidate.reason === candidates[0].reason) ) {
      const [{reason}] = this.candidates;

      this.message = `${reason}\n\n${this.candidates.map(({usage}) => `$ ${usage}`).join(`\n`)}`;
    } else if (this.candidates.length === 1) {
      const [{usage}] = this.candidates;
      this.message = `Command not found; did you mean:\n\n$ ${usage}\n${whileRunning(input)}`;
    } else {
      this.message = `Command not found; did you mean one of:\n\n${this.candidates.map(({usage}, index) => {
        return `${`${index}.`.padStart(4)} ${usage}`;
      }).join(`\n`)}\n\n${whileRunning(input)}`;
    }
  }
}

export class AmbiguousSyntaxError extends Error {
  public clipanion: ErrorMeta = {type: `none`};

  constructor(public readonly input: Array<string>, public readonly usages: Array<string>) {
    super();
    this.name = `AmbiguousSyntaxError`;

    this.message = `Cannot find who to pick amongst the following alternatives:\n\n${this.usages.map((usage, index) => {
      return `${`${index}.`.padStart(4)} ${usage}`;
    }).join(`\n`)}\n\n${whileRunning(input)}`;
  }
}

const whileRunning = (input: Array<string>) => `While running ${input.filter(token => {
  return token !== END_OF_INPUT;
}).map(token => {
  const json = JSON.stringify(token);
  if (token.match(/\s/) || token.length === 0 || json !== `"${token}"`) {
    return json;
  } else {
    return token;
  }
}).join(` `)}`;
