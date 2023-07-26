import getStream                    from 'get-stream';
import {PassThrough}                from 'stream';

import {Cli, CommandClass, Command} from '../sources/advanced';
import {PartialCompletionRequest}   from '../sources/core';


export const log = <T extends Command>(command: T, properties: Array<keyof T> = []) => {
  command.context.stdout.write(`Running ${command.constructor.name}\n`);

  for (const property of properties) {
    command.context.stdout.write(`${JSON.stringify(command[property])}\n`);
  }
};

export const runCli = async (cli: Cli | (() => Array<CommandClass>), args: Array<string>) => {
  let finalCli;

  if (typeof cli === `function`) {
    finalCli = new Cli();

    for (const command of cli()) {
      finalCli.register(command);
    }
  } else {
    finalCli = cli;
  }

  const stream = new PassThrough();
  const promise = getStream(stream);

  const exitCode = await finalCli.run(args, {
    stdin: process.stdin,
    stdout: stream,
    stderr: stream,
  });

  stream.end();

  const output = await promise;

  if (exitCode !== 0)
    throw new Error(output);

  return output;
};

export const completeCli = async (cli: Cli | (() => Array<CommandClass>), request: PartialCompletionRequest) => {
  let finalCli;

  if (typeof cli === `function`) {
    finalCli = new Cli();

    for (const command of cli()) {
      finalCli.register(command);
    }
  } else {
    finalCli = cli;
  }

  const stream = new PassThrough();
  const promise = getStream(stream);

  const completions = await finalCli.complete(request, {
    stdin: process.stdin,
    stdout: stream,
    stderr: stream,
  });

  stream.end();

  const output = await promise;

  // We don't dedupe results in clipanion because clcs already does it, but it's easier for us to write tests when string results are deduped
  return Object.assign([...new Set(completions)], {
    output,
  });
};

export const prefix = `\u001b[1m$ \u001b[22m`;
