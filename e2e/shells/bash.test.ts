import chaiAsPromised from 'chai-as-promised';
import chai, {expect} from 'chai';

import {testPty}      from './utils';

chai.use(chaiAsPromised);

// https://wiki.archlinux.org/title/Bash/Prompt_customization#Prompts
// For an unknown reason, setting PS1 to an empty string was suppressing
// completion output when running tests locally on Windows.
export const prompts = {
  PS0: ``,
  PS1: `>`,
  PS2: ``,
  PS3: ``,
  PS4: ``,
};

testPty({
  posix: `bash`,
  win32: `C:\\Program Files\\Git\\bin\\bash.exe`,
}, [`--norc`, `--noprofile`], {
  env: {
    ...prompts,
    // Disables the deprecation warning that appears when using the default installation of bash on macos
    // https://apple.stackexchange.com/questions/371997/suppressing-the-default-interactive-shell-is-now-zsh-message-in-macos-catalina
    BASH_SILENCE_DEPRECATION_WARNING: `1`,
  },
  setup: async bash => {
    // "Ignore-case option to readline disables nosort option to complete"
    // https://lists.defectivebydesign.org/archive/html/bug-bash/2017-05/msg00034.html
    await bash.exec(`bind "set completion-ignore-case off"`);

    await bash.exec(`. <(testbin completion bash)`);
  },
  complete: async (bash, request) => {
    const completions = (await bash.write(`\t\t`))
      .join(`\n`)
      .replaceAll(`>${request.trimEnd()}`, ``);

    return completions
      .split(/\s+/)
      .filter(completion => completion !== ``);
  },
}, spawnBash => {
  it(`should preserve the order of completions`, async () => {
    await spawnBash(async bash => {
      expect(await bash.complete(`testbin foo --number `)).to.deep.equal([`3`, `1`, `4`, `2`]);
    });
  });
});
