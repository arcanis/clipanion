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
    const output = (await pwsh.write(`\t`)).join(`\n`);
    console.log({pwshCompleteOutput: output});
    /*
     * pwsh MenuCompletion emit varies slightly between posix and windows.
     * It emits the list of completions and re-emits the request, but possibly
     * in a different order.
     * These tests are not sophisticated enough to emulate ansi escape sequences and
     * discern precisely what the user sees.
     * So we use a heuristic: we parse whatever comes before and whatever comes
     * after the re-emitted request, and return whichever one is bigger.
     *
     * For example, on Windows, we receive this (ANSI escapes omitted, whitespace changed):
     *   testbin foo --number 3
     *   3 1 4 2
     * On Posix we receive this (ANSI escapes omitted, whitespace changed):
     *   3 1 4 2
     *   testbin foo --number 3
     *   3
     */
    const requestStart = output.indexOf(request.trim());
    const requestEnd = output.indexOf(`\r\n`, requestStart) + 2;
    const before = output.slice(0, requestStart);
    const after = requestEnd > requestStart ? output.slice(requestEnd) : ``;

    const completions = before.length > after.length ? before : after;
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
