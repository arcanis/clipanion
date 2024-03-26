import {nodeResolve}                     from '@rollup/plugin-node-resolve';
import {execUtils}                       from '@yarnpkg/core';
import {xfs, PortablePath, npath, ppath} from '@yarnpkg/fslib';
import {rollup}                          from 'rollup';

const packPromise = xfs.mktempPromise().then(async packDir => {
  const packPath = ppath.join(packDir, `corepack.tgz`);

  const packed = await execUtils.execvp(`yarn`, [`pack`, `--out`, npath.fromPortablePath(packPath)], {
    cwd: npath.toPortablePath(__dirname),
  });

  expect(packed.code).toEqual(0);
  return packPath;
});

describe(`Tree shaking`, () => {
  it(`should only keep the command Options used in the bundle`, async () => {
    await xfs.mktempPromise(async tempDir => {
      const packPath = await packPromise;

      await xfs.writeJsonPromise(`${tempDir}/package.json` as PortablePath, {name: `test-treeshake`});
      await xfs.writeFilePromise(`${tempDir}/yarn.lock` as PortablePath, ``);

      const added = await execUtils.execvp(`yarn`, [`add`, npath.fromPortablePath(packPath)], {cwd: tempDir});
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
      expect(multiCode.length).toBeGreaterThanOrEqual(singleCode.length + 20);
    });
  }, 20000);
});

describe(`Browser support`, () => {
  it(`should only keep the command Options used in the bundle`, async () => {
    await xfs.mktempPromise(async tempDir => {
      const packPath = await packPromise;

      await xfs.writeJsonPromise(`${tempDir}/package.json` as PortablePath, {name: `test-treeshake`});
      await xfs.writeFilePromise(`${tempDir}/yarn.lock` as PortablePath, ``);

      const added = await execUtils.execvp(`yarn`, [`add`, npath.fromPortablePath(packPath)], {cwd: tempDir});
      expect(added.code).toEqual(0);

      await xfs.writeFilePromise(`${tempDir}/index.js` as PortablePath, `import { Cli } from 'clipanion';\n`);

      const warnings: Array<any> = [];

      await rollup({
        input: npath.fromPortablePath(`${tempDir}/index.js`),
        plugins: [nodeResolve({preferBuiltins: true, browser: true})],
        onwarn: warning => warnings.push(warning),
      });

      expect(warnings).toEqual([]);

      await rollup({
        input: npath.fromPortablePath(`${tempDir}/index.js`),
        plugins: [nodeResolve({preferBuiltins: true})],
        onwarn: warning => warnings.push(warning),
      });

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings).toEqual(expect.arrayContaining([expect.objectContaining({
        code: `UNRESOLVED_IMPORT`,
        source: `tty`,
      })]));
    });
  }, 20000);
});
