
import chaiAsPromised   from 'chai-as-promised';
import chai, {expect}   from 'chai';
import getStream        from 'get-stream';
import {PassThrough}    from 'stream';

import * as stdoutUtils from '../sources/stdoutUtils';

chai.use(chaiAsPromised);

async function bufferStdio(cb: (stdio: {stdout: PassThrough, stderr: PassThrough}) => Promise<void>) {
  const stdout = new PassThrough();
  const stderr = new PassThrough();

  await cb({stdout, stderr});

  stdout.end();
  stderr.end();

  return {
    stdout: await getStream(stdout),
    stderr: await getStream(stderr),
  };
}

describe(`clcs`, () => {
  describe(`stdoutUtils`, () => {
    describe(`traceAndRedirectStdout`, () => {
      it(`should redirect stdout writes to stderr`, async () => {
        const {stdout, stderr} = await bufferStdio(async ({stdout, stderr}) => {
          await stdoutUtils.traceAndRedirectStdout({stdout, stderr}, async () => {
            stdout.write(`foo\n`);
          });
        });

        expect(stdout).to.eq(``);
        expect(stderr).to.contain(`foo\n`);
      });

      it(`should trace writes to stdout`, async () => {
        const {stderr} = await bufferStdio(async ({stdout, stderr}) => {
          await stdoutUtils.traceAndRedirectStdout({stdout, stderr}, async () => {
            (function test() {
              stdout.write(`foo\n`);
            })();
          });
        });

        expect(stderr).to.match(/stdout\.write\n {4}foo\n\n {6}at test \(.+\)\n\n/);
      });

      it(`shouldn't affect writes to stderr`, async () => {
        const {stdout, stderr} = await bufferStdio(async ({stdout, stderr}) => {
          await stdoutUtils.traceAndRedirectStdout({stdout, stderr}, async () => {
            stderr.write(`foo\n`);
          });
        });

        expect(stdout).to.eq(``);
        expect(stderr).to.eq(`foo\n`);
      });
    });
  });
});


