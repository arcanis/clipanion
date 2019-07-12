import {Cli, Command} from '../core';

const cli = new Cli();

cli.register(new Command({
    path: [],
    options: {
        simple: new Set([`-x`,`-y`,`-z`, `--hello-world`, `--foo-bar`]),
    },
}, parsed => parsed));

cli.register(new Command({
    path: [`foo`, `bar`],
    options: {
        simple: new Set([`-a`, `-b`]),
        complex: new Set([`-c`]),
    },
    positionals: {
        minimum: 1,
        maximum: Infinity,
        proxy: true,
    },
}, parsed => parsed));

cli.register(new Command({
    path: [`foo`, `bar`],
    options: {
        simple: new Set([`-x`,`-y`,`-z`]),
    },
    positionals: {
        minimum: 1,
        maximum: 2,
    },
}, parsed => parsed));

console.time();
const machine = cli.start();

for (const arg of process.argv.slice(2))
    machine.write(arg);

const command = machine.digest();
console.timeEnd();

console.log(command);
