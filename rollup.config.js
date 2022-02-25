import ts   from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';

// eslint-disable-next-line arca/no-default-export
export default {
  input: `./sources/advanced/index.ts`,
  output: [
    {
      dir: `lib`,
      entryFileNames: `[name].mjs`,
      format: `es`,
    },
    {
      dir: `lib`,
      entryFileNames: `[name].js`,
      format: `cjs`,
    },
  ],
  preserveModules: true,
  external: [
    `typanion`,
  ],
  plugins: [
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
