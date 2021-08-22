require(`string.prototype.replaceall`).shim();

import {npath, PortablePath, xfs} from '@yarnpkg/fslib';
import {spawnSync}                from 'child_process';
import * as pty                   from 'node-pty';
import stripAnsi                  from 'strip-ansi';
import {promisify}                from 'util';

export const sleep = promisify(setTimeout);

// The time we wait for output to be collected after writing to the pty
const DEFAULT_TIMEOUT = 1000;

export type Pty = {
  cwd: PortablePath;

  write(data: string): Promise<Array<string>>;
  exec(data: string): Promise<Array<string>>;
  complete(data: string): Promise<Array<string>>;
};

export type PtyCallback = (pty: Pty) => Promise<void>;

export type MakePtyOptions = {
  complete: (pty: Pty, data: string) => Promise<Array<string>>,
  env?: NodeJS.ProcessEnv,
  setup?: PtyCallback,
};

const BEL = `\x07`;

const DEVICE_STATUS_REPORT = `\x1B[6n`;

const clean = (chunk: string) =>
  stripAnsi(chunk)
    .replaceAll(BEL, ``)
    .trim();

export const makePty = (shell: string, args: string | Array<string>, {complete, env, setup}: MakePtyOptions) => {
  const version = spawnSync(shell, [`--version`], {
    stdio: `pipe`,
    encoding: `utf8`,
  });

  console.log(`${shell}: ${(version.error as any)?.code === `ENOENT` ? `not found` : version.stdout.split(`\n`)[0]}`);
  console.log();

  return async (cb: PtyCallback) => {
    return await xfs.mktempPromise(async tmpHomedir => {
      return await xfs.mktempPromise(async tmpdir => {
        const ptyProcess = pty.spawn(shell, args, {
          // https://invisible-island.net/ncurses/terminfo.src.html#tic-ansi-generic
          name: `ansi-generic`,
          cols: 80,
          rows: 30,
          cwd: npath.fromPortablePath(tmpdir),
          env: {
            HOME: npath.fromPortablePath(tmpHomedir),
            USERPROFILE: npath.fromPortablePath(tmpHomedir),
            // Add `testbin` to the PATH
            PATH: `${npath.dirname(require.resolve(`testbin/bin/testbin`))}${npath.delimiter}${process.env.PATH}`,
            ...env,
          },
        });

        const chunks: Array<string> = [];

        const push = (chunk: string) => chunks.push(clean(chunk));
        const flush = () => chunks.splice(0).filter(chunk => chunk.match(/\S/));

        ptyProcess.onData(response => {
          // PowerShell goes crazy if we don't respond to its cursor position request
          // https://github.com/PowerShell/PSReadLine/issues/1376
          if (response.includes(DEVICE_STATUS_REPORT))
            ptyProcess.write(`\x1B[1;1R`);

          push(response);
        });

        let killed = false;

        ptyProcess.onExit(code => {
          if (!killed) {
            throw new Error(`${shell} exited with code ${code.exitCode}${code.signal ? ` (signal ${code.signal})` : ``}`);
          }
        });

        const ptyArg: Pty = {
          cwd: tmpdir,

          async write(request: string) {
            ptyProcess.write(request);

            await sleep(DEFAULT_TIMEOUT);

            return flush();
          },

          async exec(request: string) {
            await this.write(request);

            return await this.write(`\r`);
          },

          async complete(request: string) {
            await this.write(request);

            return await complete(this, request);
          },
        };

        await setup?.(ptyArg);

        try {
          return await cb(ptyArg);
        } finally {
          killed = true;
          ptyProcess.kill();
        }
      });
    });
  };
};
