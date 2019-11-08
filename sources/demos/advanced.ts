import {Readable, Writable} from 'stream';
import * as yup             from 'yup';

import {Cli, Command}       from '../advanced';

type Context = {
    cwd: string;
    stdin: Readable;
    stdout: Writable;
    stderr: Writable;
}

yup.addMethod(yup.object, `atMostOneOf`, function (list: Array<string>) {
    return this.test({
        name: `atMostOneOf`,
        message: `\${path} must only have at most one of these keys: \${keys}`,
        params: { keys: list.join(`, `) },
        test: value => value == null || list.filter(f => !!value[f]).length <= 1,
    });
});

declare module 'yup' {
    interface Schema<T> {
        atMostOneOf(keys: string[]): this;
    }
}

class YarnDefaultDefinitions extends Command<Context> {
    @Command.Path(`--clipanion=definitions`)
    async execute() {
        this.context.stdout.write(`${JSON.stringify(this.cli.definitions(), null, 2)}\n`);
    }
}

class YarnDefaultHelp extends Command<Context> {
    @Command.Path(`-h`)
    @Command.Path(`--help`)
    async execute() {
        this.context.stdout.write(this.cli.usage());
    }
}

class YarnDefaultRun extends Command<Context> {
    @Command.String()
    public scriptName!: string;

    @Command.Proxy()
    public rest!: Array<string>;

    async execute() {
        return await this.cli.run([`run`, this.scriptName, ...this.rest], {});
    }
}

class YarnInstall extends Command<Context> {
    @Command.Boolean(`--frozen-lockfile`)
    public frozenLockfile: boolean = false;

    @Command.Path(`install`)
    @Command.Path()
    async execute() {
        this.context.stdout.write(`Running an install: ${this.context.cwd}\n`);
    }
}

class YarnRunListing extends Command<Context> {
    @Command.Boolean(`--json`)
    public json: boolean = false;

    @Command.Path(`run`)
    async execute() {
        this.context.stdout.write(`Listing all the commands (json = ${this.json})\n`);
    }
}

class YarnRunExec extends Command<Context> {
    @Command.String()
    public scriptName!: string;

    @Command.Proxy()
    public rest!: string[];

    static usage = Command.Usage({
        category: `Script-related commands`,
    });

    @Command.Path(`run`)
    async execute() {
        this.context.stdout.write(`Executing a script named ${this.scriptName} ${this.rest}\n`)
    }
}

export default class YarnAdd extends Command<Context> {
    @Command.Boolean(`-D,--dev`)
    public dev: boolean = false;

    @Command.Boolean(`-P,--peer`)
    public peer: boolean = false;

    @Command.Boolean(`-E,--exact`)
    public exact: boolean = false;

    @Command.Boolean(`-T,--tilde`)
    public tilde: boolean = false;

    @Command.Rest({required: 1})
    public pkgs: string[] = [];

    static schema = yup.object()
        .atMostOneOf([`dev`, `peer`])
        .atMostOneOf([`exact`, `tilde`]);

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

    @Command.Path(`add`)
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
    @Command.Rest()
    packages: string[] = [];

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

    @Command.Path(`remove`)
    async execute() {
    }
}

const cli = new Cli<Context>({
    binaryLabel: `Yarn Project Manager`,
    binaryName: `yarn`,
    binaryVersion: `v0.0.0`,
});

cli.register(YarnDefaultDefinitions);
cli.register(YarnDefaultHelp);
cli.register(YarnDefaultRun);
cli.register(YarnInstall);
cli.register(YarnRemove);
cli.register(YarnRunListing);
cli.register(YarnRunExec);
cli.register(YarnAdd);

/*
cli.runExit(process.argv.slice(2), {
    cwd: process.cwd(),
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
});
*/

cli.suggestFor(process.argv.slice(2));
