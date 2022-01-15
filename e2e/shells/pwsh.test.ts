import chaiAsPromised from 'chai-as-promised';
import chai, {expect} from 'chai';

import {testPty}      from './utils';

chai.use(chaiAsPromised);

testPty({
  posix: `pwsh`,
  win32: `pwsh.exe`,
}, [`-NoProfile`, `-NoLogo`], {
  setup: async pwsh => {
    // Disables the prompt
    // Apparently PowerShell really hates empty strings
    await pwsh.exec(`function prompt { " " }`);

    // Makes PowerShell display a completion menu on tab (which includes descriptions)
    // rather than a flat list of completions
    await pwsh.exec(`Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete`);

    await pwsh.exec(`testbin completion pwsh | Out-String | Invoke-Expression`);
  },
  complete: async (pwsh, request) => {
    const output = await pwsh.write(`\t`);

    const completions = output
      .slice(0, output.findIndex(value => value.includes(request.trim())))
      .join(`\n`);

    return completions
      .split(/\s+/)
      .filter(completion => completion !== ``);
  },
}, spawnPwsh => {
  it(`should preserve the order of completions`, async () => {
    await spawnPwsh(async pwsh => {
      expect(await pwsh.complete(`testbin foo --number `)).to.deep.equal([`3`, `1`, `4`, `2`]);
    });
  });
});