import * as errors from './errors';

declare const console: any;
declare const process: any;

export const NODE_INITIAL = 0;
export const NODE_SUCCESS = 1;
export const NODE_ERRORED = 2;

export const START_OF_INPUT = `\u0001`;
export const END_OF_INPUT = `\u0000`;

export const HELP_COMMAND_INDEX = -1;

export const HELP_REGEX = /^(-h|--help)(?:=([0-9]+))?$/;

// ------------------------------------------------------------------------

export const DEBUG = process.env.DEBUG_CLI === `1`;

export function debug(str: string) {
    if (DEBUG) {
        console.log(str);
    }
}

// ------------------------------------------------------------------------

export type StateMachine = {
    nodes: Node[];
};

export type RunState = {
    candidateUsage: string | null;
    errorMessage: string | null;
    ignoreOptions: boolean;
    options: {name: string, value: any}[];
    path: string[];
    positionals: {value: string, extra: boolean}[];
    selectedIndex: number | null;
};

export function makeStateMachine(): StateMachine {
    return {
        nodes: [makeNode(), makeNode(), makeNode()],
    };
}

export function makeAnyOfMachine(inputs: StateMachine[]) {
    const output = makeStateMachine();
    const heads = [];

    let offset = output.nodes.length;

    for (const input of inputs) {
        heads.push(offset);

        for (let t = 0; t < input.nodes.length; ++t)
            if (!isTerminalNode(t))
                output.nodes.push(cloneNode(input.nodes[t], offset));

        offset += input.nodes.length - 2;
    }

    for (const head of heads)
        registerShortcut(output, NODE_INITIAL, head);

    return output;
}

export function injectNode(machine: StateMachine, node: Node) {
    machine.nodes.push(node);
    return machine.nodes.length - 1;
}

export function simplifyMachine(input: StateMachine) {
    const visited = new Set();

    const process = (node: number) => {
        if (visited.has(node))
            return;

        visited.add(node);

        const nodeDef = input.nodes[node];

        for (const transitions of Object.values(nodeDef.statics))
            for (const {to} of transitions)
                process(to);
        for (const [,{to}] of nodeDef.dynamics)
            process(to);
        for (const {to} of nodeDef.shortcuts)
            process(to);

        const shortcuts = new Set(nodeDef.shortcuts.map(({to}) => to));

        while (nodeDef.shortcuts.length > 0) {
            const {to} = nodeDef.shortcuts.shift()!;
            const toDef = input.nodes[to];

            for (const [segment, transitions] of Object.entries(toDef.statics)) {
                let store = !Object.prototype.hasOwnProperty.call(nodeDef.statics, segment)
                    ? nodeDef.statics[segment] = []
                    : nodeDef.statics[segment];

                for (const transition of transitions) {
                    if (!store.some(({to}) => transition.to === to)) {
                        store.push(transition);
                    }
                }
            }

            for (const [test, transition] of toDef.dynamics)
                if (!nodeDef.dynamics.some(([otherTest, {to}]) => test === otherTest && transition.to === to))
                    nodeDef.dynamics.push([test, transition]);

            for (const transition of toDef.shortcuts) {
                if (!shortcuts.has(transition.to)) {
                    nodeDef.shortcuts.push(transition);
                    shortcuts.add(transition.to);
                }
            }
        }
    };

    process(NODE_INITIAL);
}

export function debugMachine(machine: StateMachine, {prefix = ``}: {prefix?: string} = {}) {
    debug(`${prefix}Nodes are:`);
    for (let t = 0; t < machine.nodes.length; ++t) {
        debug(`${prefix}  ${t}: ${JSON.stringify(machine.nodes[t])}`);
    }
}

export function runMachine(machine: StateMachine, input: string[]) {
    debug(`Running a vm on ${JSON.stringify(input)}`);
    let branches: {node: number, state: RunState}[] = [{node: NODE_INITIAL, state: {
        candidateUsage: null,
        errorMessage: null,
        ignoreOptions: false,
        options: [],
        path: [],
        positionals: [],
        selectedIndex: null,
    }}];

    debugMachine(machine, {prefix: `  `});

    for (const segment of [START_OF_INPUT, ...input, END_OF_INPUT]) {
        debug(`  Processing ${JSON.stringify(segment)}`)
        const nextBranches: {node: number, state: RunState}[] = [];

        for (const {node, state} of branches) {
            debug(`    Current node is ${node}`);
            const nodeDef = machine.nodes[node];

            if (node === NODE_ERRORED) {
                nextBranches.push({node, state});
                continue;
            }

            console.assert(
                nodeDef.shortcuts.length === 0,
                `Shortcuts should have been eliminated by now`,
            );

            if (Object.prototype.hasOwnProperty.call(nodeDef.statics, segment)) {
                const transitions = nodeDef.statics[segment];
                for (const {to, reducer} of transitions) {
                    nextBranches.push({node: to, state: typeof reducer !== `undefined` ? execute(reducers, reducer, state, segment) : state});
                    debug(`      Static transition to ${to} found`);
                }
            } else {
                debug(`      No static transition found`);
            }

            if (segment !== END_OF_INPUT) {
                for (const [test, {to, reducer}] of nodeDef.dynamics) {
                    if (execute(tests, test, state, segment)) {
                        nextBranches.push({node: to, state: typeof reducer !== `undefined` ? execute(reducers, reducer, state, segment) : state});
                        debug(`      Dynamic transition to ${to} found (via ${test})`);
                    }
                }
            }
        }

        if (nextBranches.every(({node}) => node === NODE_ERRORED)) {
            throw new errors.UnknownSyntaxError(nextBranches.filter(({state}) => {
                return state.candidateUsage !== null;
            }).map(({state}) => {
                return {usage: state.candidateUsage!, reason: state.errorMessage};
            }));
        }

        branches = trimSmallerBranches(nextBranches);
    }

    if (branches.length > 0) {
        debug(`  Results:`);
        for (const branch of branches) {
            debug(`    - ${branch.node} -> ${JSON.stringify(branch.state)}`);
        }
    } else {
        debug(`  No results`);
    }

    return selectBestState(branches.map(({state}) => {
        return state;
    }));
}

export function trimSmallerBranches(branches: {node: number, state: RunState}[]) {
    let maxPathSize = 0;
    for (const {state} of branches)
        if (state.path.length > maxPathSize)
            maxPathSize = state.path.length;

    return branches.filter(({state}) => {
        return state.path.length === maxPathSize;
    });
}

export function selectBestState(states: RunState[]) {
    const terminalStates = states.filter(state => {
        return state.selectedIndex !== null;
    });

    if (terminalStates.length === 0)
        throw new Error();

    let maxPathSize = 0;
    for (const state of terminalStates)
        if (state.path.length > maxPathSize)
            maxPathSize = state.path.length;

    const bestPathBranches = terminalStates.filter(state => {
        return state.path.length === maxPathSize;
    });

    const getPositionalCount = (state: RunState) => state.positionals.filter(({extra}) => {
        return !extra;
    }).length + state.options.length;

    const statesWithPositionalCount = bestPathBranches.map(state => {
        return {state, positionalCount: getPositionalCount(state)};
    });

    let maxPositionalCount = 0;
    for (const {positionalCount} of statesWithPositionalCount)
        if (positionalCount > maxPositionalCount)
            maxPositionalCount = positionalCount;

    const bestPositionalStates = statesWithPositionalCount.filter(({positionalCount}) => {
        return positionalCount === maxPositionalCount;
    }).map(({state}) => {
        return state;
    });

    const fixedStates = aggregateHelpStates(bestPositionalStates);
    if (fixedStates.length > 1)
        throw new Error();

    return fixedStates[0];
}

export function aggregateHelpStates(states: RunState[]) {
    const notHelps: RunState[] = [];
    const helps = [];

    for (const state of states) {
        if (state.selectedIndex === HELP_COMMAND_INDEX) {
            helps.push(...state.options);
        } else {
            notHelps.push(state);
        }
    }

    if (helps.length > 0) {
        notHelps.push({
            candidateUsage: null,
            errorMessage: null,
            ignoreOptions: false,
            path: [],
            positionals: [],
            options: helps,
            selectedIndex: HELP_COMMAND_INDEX,
        });
    }

    return notHelps;
}

// ------------------------------------------------------------------------

type Transition = {
    to: number;
    reducer?: Callback<keyof typeof reducers>;
};

type Node = {
    dynamics: [Callback<keyof typeof tests>, Transition][];
    shortcuts: Transition[];
    statics: {[segment: string]: Transition[]};
};

export function makeNode(): Node {
    return {
        dynamics: [],
        shortcuts: [],
        statics: {},
    };
}

export function isTerminalNode(node: number) {
    return node === NODE_SUCCESS || node === NODE_ERRORED;
}

export function cloneTransition(input: Transition, offset: number = 0) {
    return {
        to: !isTerminalNode(input.to) ? input.to > 2 ? input.to + offset - 2 : input.to + offset : input.to,
        reducer: input.reducer,
    };
}

export function cloneNode(input: Node, offset: number = 0) {
    const output = makeNode();

    for (const [test, transition] of input.dynamics)
        output.dynamics.push([test, cloneTransition(transition, offset)]);

    for (const transition of input.shortcuts)
        output.shortcuts.push(cloneTransition(transition, offset));

    for (const [segment, transitions] of Object.entries(input.statics))
        output.statics[segment] = transitions.map(transition => cloneTransition(transition, offset));

    return output;
}

export function registerDynamic(machine: StateMachine, from: number, test: Callback<keyof typeof tests>, to: number, reducer?: Callback<keyof typeof reducers>) {
    machine.nodes[from].dynamics.push([test, {to, reducer}]);
}

export function registerShortcut(machine: StateMachine, from: number, to: number, reducer?: Callback<keyof typeof reducers>) {
    machine.nodes[from].shortcuts.push({to, reducer});
}

export function registerStatic(machine: StateMachine, from: number, test: string, to: number, reducer?: Callback<keyof typeof reducers>) {
    let store = !Object.prototype.hasOwnProperty.call(machine.nodes[from].statics, test)
        ? machine.nodes[from].statics[test] = []
        : machine.nodes[from].statics[test];

    store.push({to, reducer});
}

// ------------------------------------------------------------------------

export type CallbackStore<T extends string> = {[key: string]: (state: RunState, segment: string, ...args: any[]) => {}};
export type Callback<T extends string> = T | [T, ...any[]];

export function execute<T extends string>(store: CallbackStore<T>, callback: Callback<T>, state: RunState, segment: string): any {
    if (Array.isArray(callback)) {
        const [name, ...args] = callback;
        return store[name](state, segment, ...args);
    } else {
        return store[callback](state, segment);
    }
}

export const tests = {
    always: () => {
        return true;
    },
    isNotOptionLike: (state: RunState, segment: string) => {
        return state.ignoreOptions || !segment.startsWith(`-`);
    },
    isOption: (state: RunState, segment: string, name: string) => {
        return !state.ignoreOptions && segment === name;
    },
    isHelp: (state: RunState, segment: string) => {
        return !state.ignoreOptions && HELP_REGEX.test(segment);
    },
    isUnsupportedOption: (state: RunState, segment: string, names: string[]) => {
        return !state.ignoreOptions && segment.startsWith(`-`) && !names.includes(segment);
    },
};

export const reducers = {
    setCandidateUsage: (state: RunState, segment: string, usage: string) => {
        return {...state, candidateUsage: usage};
    },
    setSelectedIndex: (state: RunState, segment: string, index: number) => {
        return {...state, selectedIndex: index};
    },
    pushPath: (state: RunState, segment: string) => {
        return {...state, path: state.path.concat(segment)};
    },
    pushPositional: (state: RunState, segment: string) => {
        return {...state, positionals: state.positionals.concat({value: segment, extra: false})}
    },
    pushExtra: (state: RunState, segment: string) => {
        return {...state, positionals: state.positionals.concat({value: segment, extra: true})}
    },
    pushBoolean: (state: RunState, segment: string) => {
        return {...state, options: state.options.concat({name: segment, value: true})};
    },
    pushString: (state: RunState, segment: string) => {
        return {...state, options: state.options.concat({name: segment, value: undefined})}
    },
    setStringValue: (state: RunState, segment: string) => {
        return {... state, options: state.options.slice(0, -1).concat({...state.options[state.options.length - 1], value: segment})}
    },
    inhibateOptions: (state: RunState) => {
        return {...state, ignoreOptions: true};
    },
    useHelp: (state: RunState, segment: string, command: number) => {
        const [, name, index] = segment.match(HELP_REGEX)!;

        if (typeof index !== `undefined`) {
            return {...state, options: [{name: `-c`, value: String(command)}, {name: `-i`, value: index}]};
        } else {
            return {...state, options: [{name: `-c`, value: String(command)}]};
        }
    },
    setError: (state: RunState, segment: string, errorMessage: string) => {
        if (segment === END_OF_INPUT) {
            return {...state, errorMessage: `${errorMessage}.`};
        } else {
            return {...state, errorMessage: `${errorMessage} ("${segment}").`};
        }
    },
};

// ------------------------------------------------------------------------

export type ArityDefinition = {
    leading: number;
    extra: number;
    trailing: number;
    proxy: boolean;
};

export type OptDefinition = {
    names: string[];
    arity: 1 | 0;
};

export class CommandBuilder<Context> {
    public readonly cliIndex: number;
    public readonly cliOpts: Readonly<CliOptions>;

    private readonly allOptionNames: string[] = [];
    private readonly arity: ArityDefinition = {leading: 0, trailing: 0, extra: 0, proxy: false};
    private readonly options: OptDefinition[] = [];
    private readonly paths: string[][] = [];

    private context?: Context;

    constructor(cliIndex: number, cliOpts: CliOptions) {
        this.cliIndex = cliIndex;
        this.cliOpts = cliOpts;
    }

    addPath(path: string[]) {
        this.paths.push(path);
    }

    setArity({leading = this.arity.leading, trailing = this.arity.trailing, extra = this.arity.extra, proxy = this.arity.proxy}: Partial<ArityDefinition>) {
        Object.assign(this.arity, {leading, trailing, extra, proxy});
    }

    addPositional({required = true}: {required?: boolean} = {}) {
        if (!required && this.arity.extra === Infinity)
            throw new Error(`Optional parameters cannot be declared when using .rest() or .proxy()`);
        if (!required && this.arity.trailing > 0)
            throw new Error(`Optional parameters cannot be declared after the required trailing positional arguments`);

        if (!required) {
            this.arity.extra += 1;
        } else if (this.arity.extra === 0) {
            this.arity.leading += 1;
        } else {
            this.arity.trailing += 1;
        }
    }

    addRest({required = 0}: {required?: number} = {}) {
        if (this.arity.extra === Infinity)
            throw new Error(`Infinite lists cannot be declared multiple times in the same command`);
        if (this.arity.trailing > 0)
            throw new Error(`Infinite lists cannot be declared after the required trailing positional arguments`);

        for (let t = 0; t < required; ++t)
            this.addPositional();

        this.arity.extra = Infinity;
    }

    addProxy() {
        this.addRest();
        this.arity.proxy = true;
    }

    addOption({names, arity = 0}: {names: string[], arity?: 0 | 1}) {
        this.allOptionNames.push(...names);
        this.options.push({names, arity});
    }

    setContext(context: Context) {
        this.context = context;
    }

    usage({detailed = true}: {detailed?: boolean} = {}) {
        const segments = [this.cliOpts.binaryName];

        if (this.paths.length > 0)
            segments.push(...this.paths[0]);

        if (detailed) {
            for (const {names, arity} of this.options) {
                const args = [];

                for (let t = 0; t < arity; ++t)
                    args.push(` #${t}`);

                segments.push(`[${names.join(`,`)}${args.join(``)}]`);
            }

            for (let t = 0; t < this.arity.leading; ++t)
                segments.push(`<arg>`);

            if (this.arity.extra === Infinity)
                segments.push(`...`);
            else for (let t = 0; t < this.arity.extra; ++t)
                segments.push(`[arg]`);

            for (let t = 0; t < this.arity.trailing; ++t) {
                segments.push(`<arg>`);
            }
        }

        return segments.join(` `);
    }

    compile() {
        if (typeof this.context === `undefined`)
            throw new Error(`Assertion failed: No context attached`);

        const machine = makeStateMachine();
        let firstNode = NODE_INITIAL;

        firstNode = injectNode(machine, makeNode());
        registerStatic(machine, NODE_INITIAL, START_OF_INPUT, firstNode, [`setCandidateUsage`, this.usage()]);

        const positionalArgument = this.arity.proxy
            ? `always`
            : `isNotOptionLike`;

        const paths = this.paths.length > 0
            ? this.paths
            : [[]];

        for (const path of paths) {
            let lastPathNode = firstNode;
            for (let t = 0; t < path.length; ++t) {
                const nextPathNode = injectNode(machine, makeNode());
                registerStatic(machine, lastPathNode, path[t], nextPathNode, `pushPath`);
                lastPathNode = nextPathNode;
            }

            if (this.arity.leading > 0 || !this.arity.proxy) {
                const helpNode = injectNode(machine, makeNode());
                registerDynamic(machine, lastPathNode, `isHelp`, helpNode, [`useHelp`, this.cliIndex]);
                registerStatic(machine, helpNode, END_OF_INPUT, NODE_SUCCESS, [`setSelectedIndex`, HELP_COMMAND_INDEX]);
            }

            this.registerOptions(machine, lastPathNode);

            if (this.arity.leading > 0)
                registerStatic(machine, lastPathNode, END_OF_INPUT, NODE_ERRORED, [`setError`, `Not enough positional arguments`]);

            let lastLeadingNode = lastPathNode;
            for (let t = 0; t < this.arity.leading; ++t) {
                const nextLeadingNode = injectNode(machine, makeNode());
                this.registerOptions(machine, nextLeadingNode);

                if (this.arity.trailing > 0 || t + 1 !== this.arity.leading)
                    registerStatic(machine, nextLeadingNode, END_OF_INPUT, NODE_ERRORED, [`setError`, `Not enough positional arguments`]);

                registerDynamic(machine, lastLeadingNode, `isNotOptionLike`, nextLeadingNode, `pushPositional`);
                lastLeadingNode = nextLeadingNode;
            }

            let lastExtraNode = lastLeadingNode;
            if (this.arity.extra > 0) {
                const extraShortcutNode = injectNode(machine, makeNode());
                registerShortcut(machine, lastLeadingNode, extraShortcutNode);

                if (this.arity.extra === Infinity) {
                    const extraNode = injectNode(machine, makeNode());
                    this.registerOptions(machine, extraNode);

                    registerDynamic(machine, lastLeadingNode, positionalArgument, extraNode, `pushExtra`);
                    registerDynamic(machine, extraNode, positionalArgument, extraNode, `pushExtra`);
                    registerShortcut(machine, extraNode, extraShortcutNode);
                } else {
                    for (let t = 0; t < this.arity.extra; ++t) {
                        const nextExtraNode = injectNode(machine, makeNode());
                        this.registerOptions(machine, nextExtraNode);

                        registerDynamic(machine, lastExtraNode, positionalArgument, nextExtraNode, `pushExtra`);
                        registerShortcut(machine, nextExtraNode, extraShortcutNode);
                        lastExtraNode = nextExtraNode;
                    }
                }

                lastExtraNode = extraShortcutNode;
            }
        
            if (this.arity.trailing > 0)
                registerStatic(machine, lastExtraNode, END_OF_INPUT, NODE_ERRORED, [`setError`, `Not enough positional arguments`]);

            let lastTrailingNode = lastExtraNode;
            for (let t = 0; t < this.arity.trailing; ++t) {
                const nextTrailingNode = injectNode(machine, makeNode());
                this.registerOptions(machine, nextTrailingNode);

                if (t + 1 < this.arity.trailing)
                    registerStatic(machine, nextTrailingNode, END_OF_INPUT, NODE_ERRORED, [`setError`, `Not enough positional arguments`]);

                registerDynamic(machine, lastTrailingNode, `isNotOptionLike`, nextTrailingNode, `pushPositional`);
                lastTrailingNode = nextTrailingNode;
            }

            registerDynamic(machine, lastTrailingNode, positionalArgument, NODE_ERRORED, [`setError`, `Extraneous positional argument`]);
            registerStatic(machine, lastTrailingNode, END_OF_INPUT, NODE_SUCCESS, [`setSelectedIndex`, this.cliIndex]);
        }

        return {
            machine,
            context: this.context,
        };
    }

    private registerOptions(machine: StateMachine, node: number) {
        registerDynamic(machine, node, [`isOption`, `--`], node, `inhibateOptions`);
        registerDynamic(machine, node, [`isUnsupportedOption`, this.allOptionNames], NODE_ERRORED, [`setError`, `Unsupported option name`]);

        for (const option of this.options) {
            if (option.arity === 0) {
                for (const name of option.names) {
                    registerDynamic(machine, node, [`isOption`, name], node, `pushBoolean`);
                }
            } else if (option.arity === 1) {
                const argNode = injectNode(machine, makeNode());
                registerDynamic(machine, argNode, `isNotOptionLike`, node, `setStringValue`);

                for (const name of option.names) {
                    registerDynamic(machine, node, [`isOption`, name], argNode, `pushString`);
                }
            } else {
                throw new Error(`Unsupported option arity (${option.arity})`);
            }
        }
    }
}

export type CliOptions = {
    binaryName: string;
};

export type CliBuilderCallback<Context> =
    (command: CommandBuilder<Context>) => CommandBuilder<Context> | void;

export class CliBuilder<Context> {
    private readonly opts: CliOptions;
    private readonly builders: CommandBuilder<Context>[] = [];

    static build<Context>(cbs: CliBuilderCallback<Context>[], opts: Partial<CliOptions> = {}) {
        return new CliBuilder<Context>(opts).commands(cbs).compile();
    }

    constructor({binaryName = `...`}: Partial<CliOptions> = {}) {
        this.opts = {binaryName};
    }

    getBuilderByIndex(n: number) {
        if (!(n >= 0 && n < this.builders.length))
            throw new Error(`Assertion failed: Out-of-bound command index (${n})`);

        return this.builders[n];
    }

    commands(cbs: CliBuilderCallback<Context>[]) {
        for (const cb of cbs)
            cb(this.command());
        
        return this;
    }

    command() {
        const builder = new CommandBuilder<Context>(this.builders.length, this.opts);
        this.builders.push(builder);
    
        return builder;
    }

    compile() {
        const machines = [];
        const contexts = [];

        for (const builder of this.builders) {
            const {machine, context} = builder.compile();

            machines.push(machine);
            contexts.push(context);
        }

        const machine = makeAnyOfMachine(machines);
        simplifyMachine(machine);

        return {machine, contexts, process: (input: string[]) => {
            return runMachine(machine, input);
        }};
    }
}
