import {Readable, Writable} from 'stream';
import * as t               from 'typanion';

import {Cli, Command}       from '../advanced';

type Context = {
    cwd: string;
    stdin: Readable;
    stdout: Writable;
    stderr: Writable;
}

declare module 'yup' {
    interface Schema<T> {
        atMostOneOf(keys: string[]): this;
    }
}

class YarnDefaultDefinitions extends Command<Context> {
    static path = [`--clipanion=definitions`];
    async execute() {
        this.context.stdout.write(`${JSON.stringify(this.cli.definitions(), null, 2)}\n`);
    }
}

class YarnDefaultRun extends Command<Context> {
    scriptName = Command.String();
    rest = Command.Proxy();

    async execute() {
        return await this.cli.run([`run`, this.scriptName, ...this.rest], {});
    }
}

class YarnInstall extends Command<Context> {
    frozenLockfile = Command.Boolean(`--frozen-lockfile`, false);

    static paths = [Command.Default, `install`];
    async execute() {
        this.context.stdout.write(`Running an install: ${this.context.cwd}\n`);
    }
}

class YarnRunListing extends Command<Context> {
    json = Command.Boolean(`--json`, false);

    static path = `run`;
    async execute() {
        this.context.stdout.write(`Listing all the commands (json = ${this.json})\n`);
    }
}

class YarnRunExec extends Command<Context> {
    scriptName = Command.String();
    rest = Command.Proxy();

    static usage = Command.Usage({
        category: `Script-related commands`,
    });

    static path = `run`;
    async execute() {
        this.context.stdout.write(`Executing a script named ${this.scriptName} ${this.rest}\n`)
    }
}

export default class YarnAdd extends Command<Context> {
    dev = Command.Boolean(`-D,--dev`, false, {description: `Use dev mode`});
    peer = Command.Boolean(`-P,--peer`, false, {description: `Use peer mode`});

    exact = Command.Boolean(`-E,--exact`, false, {description: `Don't add ^ nor ~`});
    tilde = Command.Boolean(`-T,--tilde`, false, {description: `Use ~`});
    caret = Command.Boolean(`-C,--caret`, false, {description: `Use ^`});

    pkgs = Command.Rest({required: 1});

    static schema = [
        t.hasMutuallyExclusiveKeys([`dev`, `peer`]),
        t.hasMutuallyExclusiveKeys([`exact`, `tilde`, `caret`]),
    ];

    static usage = Command.Usage({
        description: `
            add dependencies to the project
        `,
        details: `
            This command adds a package to the package.json for the nearest workspace.

            - The package will by default be added to the regular \`dependencies\` field, but this behavior can be overriden thanks to the \`-D,--dev\` flag (which will cause the dependency to be added to the \`devDependencies\` field instead) and the \`-P,--peer\` flag (which will do the same but for \`peerDependencies\`).
            - If the added package doesn't specify a range at all its \`latest\` tag will be resolved and the returned version will be used to generate a new semver range (using the \`^\` modifier by default, or the \`~\` modifier if \`-T,--tilde\` is specified, or no modifier at all if \`-E,--exact\` is specified). Two exceptions to this rule: the first one is that if the package is a workspace then its local version will be used, and the second one is that if you use \`-P,--peer\` the default range will be \`*\` and won't be resolved at all.
            - If the added package specifies a tag range (such as \`latest\` or \`rc\`), Yarn will resolve this tag to a semver version and use that in the resulting package.json entry (meaning that \`yarn add foo@latest\` will have exactly the same effect as \`yarn add foo\`).

            If the \`-i,--interactive\` option is used (or if the \`preferInteractive\` settings is toggled on) the command will first try to check whether other workspaces in the project use the specified package and, if so, will offer to reuse them.

            If the \`--cached\` option is used, Yarn will preferably reuse the highest version already used somewhere within the project, even if through a transitive dependency.

            For a compilation of all the supported protocols, please consult the dedicated page from our website: http://example.org.
        `,
        examples: [[
            `Add the latest version of a package`,
            `$0 add lodash`,
        ], [
            `Add a specific version of a package`,
            `$0 add lodash@3.0.0`,
        ]],
    });

    static path = `add`;
    async execute() {
        if (this.dev) {
            this.context.stdout.write(`Adding a dev dependency\n`);
        } else if (this.peer) {
            this.context.stdout.write(`Adding a peer dependency\n`);
        } else {
            this.context.stdout.write(`Adding a dependency\n`);
        }
    }
}

class YarnRemove extends Command<Context> {
    packages = Command.Rest();

    static usage = Command.Usage({
        description: `remove dependencies from the project`,
        details: `
            This command will remove the specified packages from the current workspace. If the \`-A,--all\` option is set, the operation will be applied to all workspaces from the current project.
        `,
        examples: [[
            `Remove a dependency from the current project`,
            `$0 remove lodash`,
        ], [
            `Remove a dependency from all workspaces at once`,
            `$0 remove lodash --all`,
        ]],
    });

    static path = `remove`;
    async execute() {
    }
}

const cli = new Cli<Context>({
    binaryLabel: `Yarn Project Manager`,
    binaryName: `yarn`,
    binaryVersion: `0.0.0`,
});

cli.register(Command.Entries.Help);
cli.register(Command.Entries.Version);

cli.register(YarnDefaultDefinitions);
cli.register(YarnDefaultRun);
cli.register(YarnInstall);
cli.register(YarnRemove);
cli.register(YarnRunListing);
cli.register(YarnRunExec);
cli.register(YarnAdd);

cli.runExit(process.argv.slice(2), {
    cwd: process.cwd(),
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
});
