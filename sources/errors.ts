import {END_OF_INPUT} from './constants';

export type ErrorMeta = {
  type: `none`;
} | {
  type: `usage`;
};

/**
 * An error with metadata telling clipanion how to print it
 *
 * Errors with this metadata property will have their name and message printed, but not the
 * stacktrace.
 *
 * This should be used for errors where the message is the part that's important but the stacktrace is useless.
 * Some examples of where this might be useful are:
 *
 * - Invalid input by the user (see `UsageError`)
 * - A HTTP connection fails, the user is shown "Failed To Fetch Data: Could not connect to server example.com" without stacktrace
 * - A command in which the user enters credentials doesn't want to show a stacktract when the user enters invalid credentials
 * - ...
 */
export interface ErrorWithMeta extends Error {
  /**
   * Metadata detailing how clipanion should print this error
   */
  readonly clipanion: ErrorMeta;
}

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
    } else if (this.candidates.every(candidate => candidate.reason !== null && candidate.reason === candidates[0].reason)) {
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

    this.message = `Cannot find which to pick amongst the following alternatives:\n\n${this.usages.map((usage, index) => {
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
