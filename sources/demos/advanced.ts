import {Readable, Writable} from 'stream';
import * as t               from 'typanion';

import {Arguments, Cli, Command, Entries}       from '../advanced';

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

class YarnDefaultRun extends Command<Context> {
    scriptName = Arguments.String();
    rest = Arguments.Proxy();

    async execute() {
        return await this.cli.run([`run`, this.scriptName, ...this.rest], {});
    }
}

const isPositiveInteger = t.applyCascade(t.isNumber(), [
    t.isInteger(),
    t.isAtLeast(1),
]);

class YarnInstall extends Command<Context> {
    frozenLockfile = Arguments.Boolean(`--frozen-lockfile`, false);
    maxRetries = Arguments.String(`--max-retries`, `0`, {validator: isPositiveInteger});

    static paths = [Command.Default, [`install`]];
    async execute() {
        this.context.stdout.write(`Running an install: ${this.context.cwd}, with ${this.maxRetries} max retries\n`);
    }
}

class YarnRunListing extends Command<Context> {
    json = Arguments.Boolean(`--json`, false);

    static paths = [[`run`]];
    async execute() {
        this.context.stdout.write(`Listing all the commands (json = ${this.json})\n`);
    }
}

class YarnRunExec extends Command<Context> {
    scriptName = Arguments.String();
    rest = Arguments.Proxy();

    static usage = Command.Usage({
        category: `Script-related commands`,
    });

    static paths = [[`run`]];
    async execute() {
        this.context.stdout.write(`Executing a script named ${this.scriptName} ${this.rest}\n`)
    }
}

export default class YarnAdd extends Command<Context> {
    dev = Arguments.Boolean(`-D,--dev`, false, {description: `Use dev mode`});
    peer = Arguments.Boolean(`-P,--peer`, false, {description: `Use peer mode`});

    exact = Arguments.Boolean(`-E,--exact`, false, {description: `Don't add ^ nor ~`});
    tilde = Arguments.Boolean(`-T,--tilde`, false, {description: `Use ~`});
    caret = Arguments.Boolean(`-C,--caret`, false, {description: `Use ^`});

    pkgs = Arguments.Rest({required: 1});

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

    static paths = [[`add`]];
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
    packages = Arguments.Rest();

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

    static paths = [[`remove`]];
    async execute() {
    }
}

const cli = new Cli<Context>({
    binaryLabel: `Yarn Project Manager`,
    binaryName: `yarn`,
    binaryVersion: `0.0.0`,
});

cli.register(Entries.DefinitionsCommand);
cli.register(Entries.HelpCommand);
cli.register(Entries.VersionCommand);

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
