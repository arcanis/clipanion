import chaiAsPromised                 from 'chai-as-promised';
import chai, {expect}                 from 'chai';
import getStream                      from 'get-stream';
import {PassThrough}                  from 'stream';

import {Cli, Command, DefaultContext} from '../sources/advanced';

chai.use(chaiAsPromised);

const runCli = async (cli: Cli, args: string[]) => {
    const stream = new PassThrough();
    const promise = getStream(stream);

    const exitCode = await cli.run(args, {
        stdin: process.stdin,
        stdout: stream,
        stderr: stream,
    });

    stream.end();

    const output = await promise;

    if (exitCode !== 0)
        throw new Error(output);

    return output;
};

class NoopCommand extends Command {
    async execute() {
        this.context.stdout.write(`Executing ${this.constructor.name}`);
    }
}

class OptFooCommand extends Command {
    @Command.Boolean(`--foo`)
    public foo: boolean = false;

    async execute() {
        this.context.stdout.write(`Executing ${this.constructor.name}`);
    }
}

class OptBarCommand extends Command {
    @Command.Boolean(`--bar`)
    public bar: boolean = false;

    async execute() {
        this.context.stdout.write(`Executing ${this.constructor.name}`);
    }
}

class PositionalCommand extends Command {
    @Command.String()
    public baz?: string;

    async execute() {
        this.context.stdout.write(`Executing ${this.constructor.name}`);
    }
}

const noOptCli = new Cli({name: `bin`});
noOptCli.register(NoopCommand);

const singleOptCli = new Cli({name: `bin`});
singleOptCli.register(OptFooCommand);

const forkedOptCli = new Cli({name: `bin`});
forkedOptCli.register(OptFooCommand);
forkedOptCli.register(OptBarCommand);

const positionalCli = new Cli({name: `bin`});
positionalCli.register(PositionalCommand);

describe(`Advanced`, () => {
    it(`should print the help message when using --help (single option)`, async () => {
        const output = await runCli(singleOptCli, [`--help`]);
        expect(output).to.include(`$ bin [--foo]\n`);
    });

    it(`should print the help message when using --help (single option, --help after other options)`, async () => {
        const output = await runCli(singleOptCli, [`--foo`, `--help`]);
        expect(output).to.include(`$ bin [--foo]\n`);
    });

    it(`should print the help message when using --help (single option, --help before other options)`, async () => {
        const output = await runCli(singleOptCli, [`--help`, `--foo`]);
        expect(output).to.include(`$ bin [--foo]\n`);
    });

    it(`should print the help message when using --help (single option, --help after junk option)`, async () => {
        const output = await runCli(singleOptCli, [`--not-supported`, `--help`]);
        expect(output).to.include(`$ bin [--foo]\n`);
    });

    it(`should print the help message when using --help (single option, --help before junk option)`, async () => {
        const output = await runCli(singleOptCli, [`--help`, `--not-supported`]);
        expect(output).to.include(`$ bin [--foo]\n`);
    });

    it(`should print the help message when using --help (no options, --help after junk positional arguments)`, async () => {
        const output = await runCli(noOptCli, [`not-supported`, `--help`]);
        expect(output).to.include(`$ bin \n`);
    });

    it(`should print the help message when using --help (no options, --help before junk positional arguments)`, async () => {
        const output = await runCli(noOptCli, [`--help`, `not-supported`]);
        expect(output).to.include(`$ bin \n`);
    });

    it(`shouldn't detect --help past the -- separator (valid case)`, async () => {
        const output = await runCli(positionalCli, [`--`, `--help`]);
        expect(output).to.equal(`Executing PositionalCommand`);
    });

    it(`shouldn't detect --help past the -- separator (invalid case)`, async () => {
        const promise = runCli(positionalCli, [`--`, `foobar`, `--help`]);
        await expect(promise).to.eventually.be.rejectedWith(/Extraneous positional argument "--help"/);
    });
});
