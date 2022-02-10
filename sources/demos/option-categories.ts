import { Command, Cli, Usage, Option, Builtins } from '../advanced/index';

async function main() {
    const cli = new Cli({
        binaryLabel: 'binlabel',
        binaryName: 'binname',
        binaryVersion: 'binversion'
    });
    cli.register(DefaultCommand);
    cli.register(Builtins.HelpCommand);
    await cli.runExit(process.argv.slice(2), Cli.defaultContext);
}

class DefaultCommand extends Command {
    static paths = [Command.Default];
    static usage: Usage = {
        description: 'default command',
        details: 'details here',
        examples: [['example', 'example invocation here']]
    }

    verbose = Option.Boolean('-v,--verbose', {
        description: 'foo'
    });
    production = Option.Boolean('--prod', {
        description: 'bar',
        category: 'Credentials'
    });
    staging = Option.Boolean('--staging', {
        description: 'bar',
        category: 'Credentials'
    });
    qa = Option.Boolean('--qa', {
        description: 'bar',
        category: 'Credentials'
    });

    async execute() {}
}

main();