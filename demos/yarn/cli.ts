import {Cli, runExit} from "../../sources/advanced";

const commands = Cli.lazyFileSystem({
  cwd: `${__dirname}/commands`,
  pattern: `{}.ts`,
});

runExit({
  binaryLabel: `Fake Yarn`,
  binaryName: `fake-yarn`,
  binaryVersion: `0.0.0`,
}, commands);
