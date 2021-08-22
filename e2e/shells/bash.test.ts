import chaiAsPromised from 'chai-as-promised';
import chai, {expect} from 'chai';

import {makePty}      from './utils';

chai.use(chaiAsPromised);

const shell = process.platform === `win32`
  ? `gitbash.exe`
  : `bash`;

// https://wiki.archlinux.org/title/Bash/Prompt_customization#Prompts
export const prompts = {
  PS0: ``,
  PS1: ``,
  PS2: ``,
  PS3: ``,
  PS4: ``,
};

const spawnBash = makePty(shell, [`--norc`, `--noprofile`], {
  env: {
    ...prompts,
    // Disables the deprecation warning that appears when using the default installation of bash on macos
    // https://apple.stackexchange.com/questions/371997/suppressing-the-default-interactive-shell-is-now-zsh-message-in-macos-catalina
    BASH_SILENCE_DEPRECATION_WARNING: `1`,
  },
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
