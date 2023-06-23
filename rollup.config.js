import ts         from '@rollup/plugin-typescript';
import path       from 'path';
import copy       from 'rollup-plugin-copy';
import multiInput from 'rollup-plugin-multi-input';

// Since we're using `multiInput`, the entries output path are already set.
// We only need to define the extension we want to give to the file.
const entryFileNames = ext => ({name}) => `${path.basename(name)}${ext}`;

// eslint-disable-next-line arca/no-default-export
export default {
  input: [`sources/**/*.ts`],
  output: [
    {
      dir: `lib`,
      entryFileNames: entryFileNames(`.mjs`),
      format: `es`,
    },
    {
      dir: `lib`,
      entryFileNames: entryFileNames(`.js`),
      format: `cjs`,
    },
  ],
  preserveModules: true,
  external: [
    `clcs`,
    `tty`,
    `typanion`,
    `../platform`,
  ],
  plugins: [
    multiInput({
      relative: `sources/`,
    }),
    ts({
      tsconfig: `tsconfig.dist.json`,
      include: `./sources/**/*`,
    }),
    copy({
      targets: [
        {src: `./sources/platform/package.json`, dest: `./lib/platform/`},
      ],
    }),
  ],
};
