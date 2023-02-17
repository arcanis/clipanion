import {nodeResolve}       from '@rollup/plugin-node-resolve';
import {execUtils}         from '@yarnpkg/core';
import type {PortablePath} from '@yarnpkg/fslib';
import {xfs, npath}        from '@yarnpkg/fslib';
import {rollup}            from 'rollup';

describe(`Browser support`, () => {
  it(`should only keep the command Options used in the bundle`, async () => {
    await xfs.mktempPromise(async tempDir => {
      const rndName = Math.floor(Math.random() * 100000000).toString(16).padStart(8, `0`);

      const packed = await execUtils.execvp(`yarn`, [`pack`, `--out`, npath.fromPortablePath(`${tempDir}/${rndName}.tgz`)], {
        cwd: npath.toPortablePath(__dirname),
      });

      expect(packed.code).toEqual(0);

      await xfs.writeJsonPromise(`${tempDir}/package.json` as PortablePath, {name: `test-treeshake`});
      await xfs.writeFilePromise(`${tempDir}/yarn.lock` as PortablePath, ``);

      const added = await execUtils.execvp(`yarn`, [`add`, `./${rndName}.tgz`], {cwd: tempDir});
      expect(added.code).toEqual(0);

      await xfs.writeFilePromise(`${tempDir}/index.js` as PortablePath, `import { Cli } from 'clipanion';\n`);

      const warnings: Array<any> = [];

      await rollup({
        input: npath.fromPortablePath(`${tempDir}/index.js`),
        plugins: [nodeResolve({preferBuiltins: false, browser: true})],
        onwarn: warning => warnings.push(warning),
      });

      expect(warnings).toEqual([]);

      await rollup({
        input: npath.fromPortablePath(`${tempDir}/index.js`),
        plugins: [nodeResolve({preferBuiltins: false})],
        onwarn: warning => warnings.push(warning),
      });

      expect(warnings).toHaveLength(1);
      expect(warnings).toHaveProperty(`[0].code`, `UNRESOLVED_IMPORT`);
      expect(warnings).toHaveProperty(`[0].exporter`, `tty`);
    });
  });
});
