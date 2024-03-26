import {AsyncLocalStorage} from 'async_hooks';
import fs                  from 'fs';
import path                from 'path';
import tty                 from 'tty';

import {BaseContext}       from '../advanced/Cli';
import {lazyFactory}       from '../lazy';

export function getDefaultColorDepth() {
  if (tty && `getColorDepth` in tty.WriteStream.prototype)
    return tty.WriteStream.prototype.getColorDepth();

  if (process.env.FORCE_COLOR === `0`)
    return 1;
  if (process.env.FORCE_COLOR === `1`)
    return 8;

  if (typeof process.stdout !== `undefined` && process.stdout.isTTY)
    return 8;

  return 1;
}

let gContextStorage: AsyncLocalStorage<BaseContext> | undefined;

export function getCaptureActivator(context: BaseContext) {
  let contextStorage = gContextStorage;
  if (typeof contextStorage === `undefined`) {
    if (context.stdout === process.stdout && context.stderr === process.stderr)
      return null;

    const {AsyncLocalStorage: LazyAsyncLocalStorage} = require(`async_hooks`);
    contextStorage = gContextStorage = new LazyAsyncLocalStorage();

    const origStdoutWrite = process.stdout._write;
    process.stdout._write = function (chunk, encoding, cb) {
      const context = contextStorage!.getStore();
      if (typeof context === `undefined`)
        return origStdoutWrite.call(this, chunk, encoding, cb);

      return context.stdout.write(chunk, encoding, cb);
    };

    const origStderrWrite = process.stderr._write;
    process.stderr._write = function (chunk, encoding, cb) {
      const context = contextStorage!.getStore();
      if (typeof context === `undefined`)
        return origStderrWrite.call(this, chunk, encoding, cb);

      return context.stderr.write(chunk, encoding, cb);
    };
  }

  return <T>(fn: () => Promise<T>) => {
    return contextStorage!.run(context, fn);
  };
}

export async function lazyFileSystem<T>(args: Array<string>, {cwd, pattern}: {cwd: string, pattern: string}) {
  const extractDefault = (mod: any) => (mod.default || mod) as T;

  return lazyFactory(args, async (segment, ctx: string = cwd) => {
    const commandFile = path.join(ctx, pattern.replace(`{}`, segment));
    const commandDir = path.join(ctx, segment);

    const [commandFileStat, commandDirStat] = await Promise.all([
      fs.promises.stat(commandFile).catch(() => null),
      fs.promises.stat(commandDir).catch(() => null),
    ]);

    return {
      context: commandDirStat?.isDirectory() ? commandDir : null,
      node: commandFileStat?.isFile() ? extractDefault(await import(commandFile)) : null,
    };
  });
}
