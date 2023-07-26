import chaiAsPromised from 'chai-as-promised';
import chai, {expect} from 'chai';

import {prompts}      from './bash.test';
import {testPty}      from './utils';

chai.use(chaiAsPromised);

testPty({
  posix: `zsh`,
  win32: null,
}, [`--no-rcs`], {
  env: prompts,
  setup: async zsh => {
    // Setup ZSH's completion system
    await zsh.exec(`autoload -Uz compinit`);
    // "This security check is skipped entirely when the -C option is given."
    // https://zsh.sourceforge.io/Doc/Release/Completion-System.html#Use-of-compinit
    await zsh.exec(`compinit -C`);

    await zsh.exec(`. <(testbin completion zsh)`);
  },
  complete: async (zsh, request) => {
    const completions = (await zsh.write(`\t`))
      .join(`\n`)
      .replaceAll(request.trim(), ``);

    return completions
      .split(/\s+/)
      .filter(completion => completion !== ``);
  },
}, spawnZsh => {
  it(`should preserve the order of completions`, async () => {
    await spawnZsh(async zsh => {
      expect(await zsh.complete(`testbin foo --number `)).to.deep.equal([`3`, `1`, `4`, `2`]);
    });
  });
});
