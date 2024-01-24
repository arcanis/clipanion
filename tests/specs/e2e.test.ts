import {execUtils}                from '@yarnpkg/core';
import {xfs, PortablePath, npath} from '@yarnpkg/fslib';

describe(`E2E`, () => {
  it(`works with CommonJS`, async () => {
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

      await xfs.writeFilePromise(`${tempDir}/index.cjs` as PortablePath,
`const {Command, Option, runExit} = require('clipanion');
 
runExit(class MainCommand extends Command {
  name = Option.String();
 
  async execute() {
    this.context.stdout.write(\`Hello \${this.name}!\\n\`);
  }
})`,
      );

      const result = await execUtils.execvp(`node`, [`${tempDir}/index.cjs`, 'World'], {cwd: tempDir});
      expect(result.code).toEqual(0);
      expect(result.stdout).toEqual('Hello World!\n');
    });
  }, 20000);

  it(`works with ESM`, async () => {
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

      await xfs.writeFilePromise(`${tempDir}/index.mjs` as PortablePath,
`import {Command, Option, runExit} from 'clipanion';
 
runExit(class MainCommand extends Command {
  name = Option.String();
 
  async execute() {
    this.context.stdout.write(\`Hello \${this.name}!\\n\`);
  }
})`,
      );

      const result = await execUtils.execvp(`node`, [`${tempDir}/index.mjs`, 'World'], {cwd: tempDir});
      expect(result.code).toEqual(0);
      expect(result.stdout).toEqual('Hello World!\n');
    });
  }, 20000);
});
