import chaiAsPromised from 'chai-as-promised';
import chai, {expect} from 'chai';

import {makePty}      from './utils';

chai.use(chaiAsPromised);

// https://wiki.archlinux.org/title/Bash/Prompt_customization#Prompts
export const prompts = {
  PS0: ``,
  PS1: ``,
  PS2: ``,
  PS3: ``,
  PS4: ``,
};

const spawnBash = makePty(`bash`, [`--norc`, `--noprofile`], {
  env: prompts,
  setup: async bash => {
    await bash.exec(`. <(testbin completion bash)`);
  },
  complete: async (bash, request) => {
    const completions = (await bash.write(`\t\t`))
      .join(`\n`)
      .replaceAll(request.trim(), ``);

    return completions
      .split(/\s+/)
      .filter(completion => completion !== ``);
  },
});

describe(`e2e`, () => {
  describe(`shells`, () => {
    describe(`bash`, () => {
      it(`should preserve the order of completions`, async () => {
        await spawnBash(async bash => {
          expect(await bash.complete(`testbin foo --number `)).to.deep.equal([`3`, `1`, `4`, `2`]);
        });
      });
    });
  });
});
