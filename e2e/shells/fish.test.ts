import chaiAsPromised from 'chai-as-promised';
import chai, {expect} from 'chai';

import {testPty}      from './utils';

chai.use(chaiAsPromised);

// Fish doesn't have a --noprofile / --norc equivalent, but
// there's a workaround - setting $HOME to an empty folder:
// https://github.com/fish-shell/fish-shell/issues/3288

testPty({
  posix: `fish`,
  win32: null,
}, [], {
  env: {
    // Disables the greeting
    // eslint-disable-next-line @typescript-eslint/naming-convention
    fish_greeting: ``,
  },
  setup: async fish => {
    // Disables prompts
    await fish.exec(`function fish_prompt; end`);
    await fish.exec(`function fish_right_prompt; end`);

    // Disables fish trying to set the terminal's title
    await fish.exec(`function fish_title; end`);

    await fish.exec(`testbin completion fish | source`);
  },
  complete: async (fish, request) => {
    const completions = (await fish.write(`\t`))
      .join(`\n`)
      .replaceAll(request.trim(), ``);

    return completions
      .split(/\s+/)
      .filter(completion => completion !== ``);
  },
}, spawnFish => {
  it(`should preserve the order of completions`, async () => {
    await spawnFish(async fish => {
      expect(await fish.complete(`testbin foo --number `)).to.deep.equal([`3`, `1`, `4`, `2`]);
    });
  });
});
