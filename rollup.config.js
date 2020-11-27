import ts from '@rollup/plugin-typescript'

export default {
  input: './sources/advanced/index.ts',
  output: [
    {
      dir: 'lib',
      entryFileNames: '[name].mjs',
      format: 'es'
    },
    {
      dir: 'lib',
      entryFileNames: '[name].js',
      format: 'cjs'
    },
  ],
  preserveModules: true,
  plugins: [
    ts({
      tsconfig: 'tsconfig.dist.json'
    }),
  ]
}
