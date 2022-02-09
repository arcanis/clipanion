import {nodeResolve}              from '@rollup/plugin-node-resolve';
import {execUtils}                from '@yarnpkg/core';
import {xfs, PortablePath, npath} from '@yarnpkg/fslib';
import {rollup}                   from 'rollup';

import {expect}                   from '../expect';

describe(`Tree shaking`, () => {
  it(`should only keep the command Options used in the bundle`, async function () {
    this.timeout(20000);

    await xfs.mktempPromise(async tempDir => {
      const packed = await execUtils.execvp(`yarn`, [`pack`, `--out`, npath.fromPortablePath(`${tempDir}/dist.tgz`)], {
        cwd: npath.toPortablePath(__dirname),
      });

      expect(packed.code).to.eq(0);

      await xfs.writeJsonPromise(`${tempDir}/package.json` as PortablePath, {name: `test-treeshake`});
      await xfs.writeFilePromise(`${tempDir}/yarn.lock` as PortablePath, ``);

      const added = await execUtils.execvp(`yarn`, [`add`, `./dist.tgz`], {cwd: tempDir});
      expect(added.code).to.eq(0);

      const buildCode = async (code: string) => {
        await xfs.writeFilePromise(`${tempDir}/index.js` as PortablePath, code);

        const result = await rollup({
          input: npath.fromPortablePath(`${tempDir}/index.js`),
          plugins: [nodeResolve({preferBuiltins: true})],
          external: [`tty`],
        });

        const {output} = await result.generate({format: `esm`});
        return output[0].code;
      };

      const singleCode = await buildCode(`import { Option } from 'clipanion';\nOption.Array();\n`);
      const multiCode = await buildCode(`import { Option } from 'clipanion';\nOption.Counter();\nOption.Array();\n`);

      // We expect the output when referencing multiple symbols to be quite a
      // bit more than the number of extra characters (with some buffer to
      // account with the transpilation overhead)
      expect(multiCode.length).to.be.greaterThan(singleCode.length + 20);
    });
  });
});
