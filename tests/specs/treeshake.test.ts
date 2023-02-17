import {nodeResolve}       from '@rollup/plugin-node-resolve';
import {execUtils}         from '@yarnpkg/core';
import {xfs, npath}        from '@yarnpkg/fslib';
import type {PortablePath} from '@yarnpkg/fslib';
import {rollup}            from 'rollup';

describe(`Tree shaking`, () => {
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
      expect(multiCode.length).toBeGreaterThan(singleCode.length + 20);
    });
  });
});
