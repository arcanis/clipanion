import {Command, Option, run} from '../../sources/advanced';
import {log, useContext}      from '../tools';

class TestCommand extends Command {
  argv = Option.String(`--argv`);
  env = Option.String(`--env`, {env: `ENV`});

  async execute() {
    this.context.stdout.write(`${this.cli.binaryName}\n`);
    log(this, [`argv`, `env`]);
  }
}

describe(`Advanced`, () => {
  describe(`Helpers`, () => {
    describe(`run`, () => {
      for (const opts of [true, false]) {
        for (const arrayCommand of [true, false]) {
          for (const argv of [true, false]) {
            for (const context of [true, false]) {
              const name: Array<string> = [];

              const expectation: Array<string> = [];
              const parameters: Array<any> = [];

              expectation.push(`${opts ? `MyBin` : `...`}\n`);
              if (opts) {
                parameters.push({binaryName: `MyBin`});
                name.push(`opts`);
              }

              expectation.push(`Running TestCommand\n`);
              parameters.push(arrayCommand ? [TestCommand] : TestCommand);
              name.push(arrayCommand ? `command array` : `command`);

              expectation.push(`${argv ? `"argv"` : `undefined`}\n`);
              if (argv) {
                parameters.push([`--argv=argv`]);
                name.push(`argv`);
              }

              expectation.push(`${context ? `"ENV"` : `undefined`}\n`);
              if (context) {
                parameters.push({env: {[`ENV`]: `ENV`}});
                name.push(`context`);
              }

              it(`should work with ${name.join(` / `)}`, async () => {
                await expect(useContext(async context => {
                  const argv = process.argv;
                  const env = process.env;

                  process.argv = [`node`, `example.js`];
                  process.env = {};

                  const stdoutWrite = process.stdout.write;
                  const stderrWrite = process.stderr.write;

                  process.stdout.write = (...args: Array<any>) => context.stdout!.write.apply(context.stdout!, args as any);
                  process.stderr.write = (...args: Array<any>) => context.stderr!.write.apply(context.stderr!, args as any);

                  try {
                    return await run.apply(null, parameters as any);
                  } finally {
                    process.argv = argv;
                    process.env = env;

                    process.stdout.write = stdoutWrite;
                    process.stderr.write = stderrWrite;
                  }
                })).resolves.toEqual(expectation.join(``));
              });
            }
          }
        }
      }
    });
  });
});
