import { Command, Cli, Usage, Option, Builtins } from '../advanced/index';

const categoryGeneral = 'Commands';
const categoryAdvanced = 'Advanced';
const categoryOrder = [categoryGeneral, categoryAdvanced];

async function main() {
    const cli = new Cli({
        binaryLabel: 'binlabel',
        binaryName: 'binname',
        binaryVersion: 'binversion',
        categoryOrder
    });
    cli.register(DefaultCommand);
    cli.register(AdvancedCommand);
    cli.register(OtherACommand);
    cli.register(OtherBCommand);
    cli.register(Builtins.HelpCommand);
    await cli.runExit(process.argv.slice(2), Cli.defaultContext);
}

class DefaultCommand extends Command {
    static paths = [Command.Default];
    static usage: Usage = {
        category: categoryGeneral
    }

    async execute() {}
}
class AdvancedCommand extends Command {
    static paths = [['advanced']];
    static usage: Usage = {
        category: categoryAdvanced
    }

    async execute() {}
}

class OtherACommand extends Command {
    static paths = [['other-a']];
    static usage: Usage = {
        category: 'CategoryB not sorted explicitly'
    }

    async execute() {}
}
class OtherBCommand extends Command {
    static paths = [['other-b']];
    static usage: Usage = {
        category: 'CategoryA not sorted explicitly'
    }

    async execute() {}
}

main();