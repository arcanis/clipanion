import {Cli, Command} from '../core';

let CACHE: string | undefined = undefined;

// 1. We create a basic CLI

{
    console.time(`Cold cache`);
    const cli = makeCli(CACHE);
    const machine = cli.start();
    console.timeEnd(`Cold cache`);

    console.log(machine.write(`foo`).write(`bar`).write(`-b`).write(`arg`).digest());

    // 2. Extract the cache (usually you'd do this by running your binary on a
    // special command that would do a console.log(cli.getCache()), and would
    // then rebuild your app after replacing the `CACHE` value - for example
    // with Webpack's DefinePlugin)
    CACHE = cli.getCache();
}

// 3. Instantiate a new CLI, but this time with our cache

{
    console.time(`Warm cache`);
    const cli = makeCli(CACHE);
    const machine = cli.start();
    console.timeEnd(`Warm cache`);

    console.log(machine.write(`foo`).write(`bar`).write(`-b`).write(`arg`).digest());
}

// -----------

function makeCli(cache?: string) {
    const cli = Cli.fromCache(cache);

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

    return cli;
}