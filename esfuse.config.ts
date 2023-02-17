import type {ApplicationConfigFn} from 'esfuse';

export const config: ApplicationConfigFn = () => ({
  operations: {
    pack: {
      distDir: `lib`,
      generatedOutputs: {
        cjs: true,
        esm: true,
      },
    },
  },
});
