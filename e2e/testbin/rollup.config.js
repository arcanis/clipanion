import cjs        from '@rollup/plugin-commonjs';
import json       from '@rollup/plugin-json';
import resolve    from '@rollup/plugin-node-resolve';
import path       from 'path';
import esbuild    from 'rollup-plugin-esbuild';
import executable from 'rollup-plugin-executable';
import shebang    from 'rollup-plugin-preserve-shebang';

// eslint-disable-next-line arca/no-default-export
export default {
  input: `./sources/cli.ts`,
  output: [
    {
      file: `./bin/testbin`,
      format: `cjs`,
    },
  ],
  plugins: [
    resolve({
      extensions: [`.mjs`, `.js`, `.ts`, `.tsx`, `.json`],
      rootDir: path.join(__dirname, `../../`),
      jail: path.join(__dirname, `../../`),
      preferBuiltins: true,
    }),
    shebang(),
    json(),
    esbuild({tsconfig: false, target: `es2018`}),
    cjs({transformMixedEsModules: true, extensions: [`.js`, `.ts`]}),
    executable(),
  ],
};
