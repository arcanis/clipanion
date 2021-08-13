import path       from 'path';
import {Writable} from 'stream';

class ErrorWithStackTrace extends Error {
  constructor(message?: string, constructorOpt?: Function) {
    super(message);
    Error.captureStackTrace(this, constructorOpt);
  }
}

interface StdoutTrace {
  functionName: string;
  relevantFrame: string | null;
}

const CONSOLE_LOG = `console.log`;
const STDOUT_WRITE = `stdout.write`;

const WRITE_REGEXP = /[\s.]write\s/;
const LOCATION_REGEXP = /\((.+)\)/;
const SELECTOR_REGEXP = /:\d+(?::\d+)?$/;

function stripSelector(location: string) {
  return location.replace(SELECTOR_REGEXP, ``);
}

function extractRelevantFrame(lines: Array<string>, from: number): string | null {
  const relevantFrame = lines
    .slice(from)
    .find(line => {
      const location = LOCATION_REGEXP.exec(line)?.[1];
      if (typeof location === `undefined`)
        return false;

      return path.isAbsolute(stripSelector(location));
    });

  return relevantFrame?.trimStart() ?? null;
}

function extractStdoutTrace(stack: string | undefined): StdoutTrace | null {
  if (typeof stack === `undefined`)
    return null;

  const lines = stack.split(`\n`);

  const consoleLogIndex = lines.findIndex(line => line.includes(CONSOLE_LOG));
  if (consoleLogIndex !== -1) {
    const relevantFrame = extractRelevantFrame(lines, consoleLogIndex);
    return {
      functionName: CONSOLE_LOG,
      relevantFrame,
    };
  }

  const writeIndex = lines.findIndex(line => line.match(WRITE_REGEXP));
  if (writeIndex !== -1) {
    const relevantFrame = extractRelevantFrame(lines, writeIndex);
    return {
      functionName: STDOUT_WRITE,
      relevantFrame,
    };
  }

  return null;
}

/**
 * The options of the `traceAndRedirectStdout` function.
 */
export interface TraceAndRedirectStdoutOptions {
  stdout: Writable;
  stderr: Writable;
}

/**
 * Redirects all stdout writes to stderr and adds a stack trace to them.
 */
export async function traceAndRedirectStdout<T>({stdout, stderr}: TraceAndRedirectStdoutOptions, cb: () => T | Promise<T>): Promise<T> {
  const originalWrite = stdout._write;
  stdout._write = (chunk, encoding, callback) => {
    const message = chunk.toString(encoding);
    const {stack} = new ErrorWithStackTrace(undefined, stdout._write);

    const write = (string: string = ``) => {
      stderr.write(`${string.trimEnd()}\n`);
    };

    const stdoutTrace = extractStdoutTrace(stack);

    // Inspired by Jest

    write(`  ${stdoutTrace?.functionName ?? `Untraceable stdout write`}`);
    write(`    ${message}`);
    write();
    if (stdoutTrace !== null) {
      write(`      ${stdoutTrace.relevantFrame}`);
      write();
    }

    callback();
  };

  try {
    return await cb();
  } finally {
    stdout._write = originalWrite;
  }
}
