import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { use, expect } from 'chai';

// @ts-expect-error - No types
import chaiSnapshot from 'mocha-chai-snapshot';

import { xfs, PortablePath, npath } from '@yarnpkg/fslib';
import { execUtils } from '@yarnpkg/core';

use(chaiSnapshot);

describe(`Tree shaking`, () => {
  it(`should only keep the command Options used in the bundle`, async function () {
    this.timeout(20000);

    await xfs.mktempPromise(async (tempDir) => {
      await xfs.writeFilePromise(
        `${tempDir}/index.js` as PortablePath,
        `import { Option } from 'clipanion';\nOption.Array()`
      );
      await xfs.writeJsonPromise(`${tempDir}/package.json` as PortablePath, { name: 'test-treeshake' });
      await xfs.writeFilePromise(`${tempDir}/yarn.lock` as PortablePath, ``);

      const packed = await execUtils.execvp(`yarn`, [`pack`, `--out`, npath.fromPortablePath(`${tempDir}/dist.tgz`)], {
        cwd: npath.toPortablePath(__dirname),
      });
      expect(packed.code).to.eq(0);

      const added = await execUtils.execvp(`yarn`, [`add`, `./dist.tgz`], { cwd: tempDir });
      expect(added.code).to.eq(0);

      const result = await rollup({
        input: npath.fromPortablePath(`${tempDir}/index.js`),
        plugins: [nodeResolve()],
      });

      const code = await result.generate({ format: 'esm' });

      // @ts-expect-error - matchSnapshot is added by a plugin
      expect(code.output[0].code.replace(/\r\n?/g, '\n')).to.matchSnapshot(this);
    });
  });
});
