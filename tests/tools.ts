import getStream                                from 'get-stream';
import {PassThrough}                            from 'stream';

import {Cli, CommandClass, Command, RunContext} from '../sources/advanced';

export const log = <T extends Command>(command: T, properties: Array<keyof T> = []) => {
  command.context.stdout.write(`Running ${command.constructor.name}\n`);

  for (const property of properties) {
    command.context.stdout.write(`${JSON.stringify(command[property])}\n`);
  }
};

export const useContext = async (cb: (context: RunContext) => Promise<number>) => {
  const stream = new PassThrough();
  const promise = getStream(stream);

  const exitCode = await cb({
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

export const runCli = async (cli: Cli | (() => Array<CommandClass>), args: Array<string>) => {
  let finalCli: Cli;

  if (typeof cli === `function`) {
    finalCli = new Cli();

    for (const command of cli()) {
      finalCli.register(command);
    }
  } else {
    finalCli = cli;
  }

  return await useContext(async context => {
    return await finalCli.run(args, context);
  });
};

export const trim = (parts: TemplateStringsArray, ...args: Array<string>) => {
  const content = parts
    .reduce((acc, part, i) => acc + part + (args[i] ?? ``), ``)
    .trimEnd();

  const minLeadingSpaces = Math.min(
    ...(content.match(/^ */gm) ?? []).filter(m => m !== ``).map(m => m.length)
  );

  const indentations = new RegExp(`^ {${minLeadingSpaces}}`, `gm`);
  const minimumIndentation = content.replace(indentations, ``);

  return minimumIndentation.trimStart().concat(`\n`);
};
