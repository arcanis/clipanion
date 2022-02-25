import {nodeResolve}              from '@rollup/plugin-node-resolve';
import {execUtils}                from '@yarnpkg/core';
import {xfs, PortablePath, npath} from '@yarnpkg/fslib';
import {rollup}                   from 'rollup';

import {expect}                   from '../expect';

describe(`Browser support`, () => {
  it(`should only keep the command Options used in the bundle`, async function () {
    this.timeout(20000);

    await xfs.mktempPromise(async tempDir => {
      const rndName = Math.floor(Math.random() * 100000000).toString(16).padStart(8, `0`);

      const packed = await execUtils.execvp(`yarn`, [`pack`, `--out`, npath.fromPortablePath(`${tempDir}/${rndName}.tgz`)], {
        cwd: npath.toPortablePath(__dirname),
      });

      expect(packed.code).to.eq(0);

      await xfs.writeJsonPromise(`${tempDir}/package.json` as PortablePath, {name: `test-treeshake`});
      await xfs.writeFilePromise(`${tempDir}/yarn.lock` as PortablePath, ``);

      const added = await execUtils.execvp(`yarn`, [`add`, `./${rndName}.tgz`], {cwd: tempDir});
      expect(added.code).to.eq(0);

      await xfs.writeFilePromise(`${tempDir}/index.js` as PortablePath, `import { Cli } from 'clipanion';\n`);

      const warnings: Array<any> = [];

      await rollup({
        input: npath.fromPortablePath(`${tempDir}/index.js`),
        plugins: [nodeResolve({preferBuiltins: true, browser: true})],
        onwarn: warning => warnings.push(warning),
      });

      expect(warnings).to.deep.equal([]);

      await rollup({
        input: npath.fromPortablePath(`${tempDir}/index.js`),
        plugins: [nodeResolve({preferBuiltins: true})],
        onwarn: warning => warnings.push(warning),
      });

      expect(warnings).to.have.length(1);
      expect(warnings).to.have.nested.property(`[0].code`, `UNRESOLVED_IMPORT`);
      expect(warnings).to.have.nested.property(`[0].source`, `tty`);
    });
  });
});
