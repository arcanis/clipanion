import {Parsed, RecursivePartial, deepMerge} from './helpers';
import { runInThisContext } from 'vm';

export type ParseEntry =
    | {type: `positional`, value: string}
    | {type: `option`, name: string, value: any};

export type Builder = (segment: string) => ParseEntry | ParseEntry[];

export type Node = {
    label: string;
    weight: number;
    terminal: boolean;
    transitions: Map<string, {target: number, builder?: Builder}>;
    dynamics: {condition: (segment: string) => boolean, target: number, builder?: Builder}[];
};

export type Definition = {
    path: string[];
    options: {
        simple: Set<string>;
        complex: Set<string>;
    };
    positionals: {
        minimum: number;
        maximum: number;
        proxy: boolean;
    };
};

const DEFAULT_COMMAND_OPTIONS: Definition = {
    path: [],
    options: {
        simple: new Set(),
        complex: new Set(),
    },
    positionals: {
        minimum: 0,
        maximum: 0,
        proxy: false,
    },
};

function isPositionalArgument(segment: string) {
    return !segment.startsWith(`-`);
}

const OPTION_REGEXP = /^-[a-z]|--[a-z]+(-[a-z]+)*$/;

function isOptionLike(segment: string) {
    return OPTION_REGEXP.test(segment);
}

function always() {
    return true;
}

const HELP_OPTIONS = new Set([`-h`, `--help`]);

function isNotHelpNorSeparator(segment: string) {
    return !HELP_OPTIONS.has(segment) && segment !== `--`;
}

function isOptionLikeButNotHelp(segment: string) {
    return isOptionLike(segment) && !HELP_OPTIONS.has(segment);
}

const BATCH_REGEXP = /^-[a-z0-9]{2,}$/;

function makeIsOptionBatch(definition: Definition) {
    return (segment: string) => {
        if (!BATCH_REGEXP.test(segment))
            return false;

        for (let t = 1; t < segment.length; ++t)
            if (!definition.options.simple.has(`-${segment.charAt(t)}`))
                return false;

        return true;
    };
}

function makeIsUnsupportedOption(definition: Definition) {
    const options = new Set([
        ...definition.options.simple,
        ...definition.options.complex,
    ]);

    return function isUnsupportedOption(segment: string) {
        if (isPositionalArgument(segment) || segment === `--`)
            return false;

        const idx = segment.indexOf(`=`);
        const name = idx === -1 ? segment : segment.substr(0, idx);

        return !options.has(name);
    };
}

function makeIsInlineOption(definition: Definition) {
    const options = new Set([
        ...definition.options.simple,
        ...definition.options.complex,
    ]);

    return function isInlineOption(segment: string) {
        if (isPositionalArgument(segment))
            return false;

        const idx = segment.indexOf(`=`);
        if (idx === -1)
            return false;

        const name = segment.substr(0, idx);
        if (!options.has(name))
            return false;

        return true;
    };
}

function generatePositional(segment: string): ParseEntry {
    return {type: `positional`, value: segment};
}

function generateBoolean(segment: string): ParseEntry {
    return {type: `option`, name: segment, value: true};
}

function generateString(key: string, segment: string): ParseEntry {
    return {type: `option`, name: key, value: segment};
}

function generateStringFromInline(segment: string): ParseEntry {
    const idx = segment.indexOf(`=`);
    return generateString(segment.substr(0, idx), segment.substr(idx + 1));
}

function generateBooleansFromBatch(segment: string): ParseEntry[] {
    let results = [];

    for (let t = 1; t < segment.length; ++t)
        results.push(generateBoolean(`-${segment.charAt(t)}`));

    return results;
}

export class Command<T> {
    definition: Definition;
    nodes: Node[];

    isOptionBatch: (segment: string) => boolean;
    isUnsupportedOption: (segment: string) => boolean;
    isInlineOption: (segment: string) => boolean;

    private compiled = false;

    constructor(definition: RecursivePartial<Definition>, public readonly transform: (parsed: Parsed) => T) {
        this.definition = deepMerge({}, DEFAULT_COMMAND_OPTIONS, definition) as Definition;

        this.nodes = [];
        this.createNode(0, `initial`);

        this.isOptionBatch = makeIsOptionBatch(this.definition);
        this.isUnsupportedOption = makeIsUnsupportedOption(this.definition);
        this.isInlineOption = makeIsInlineOption(this.definition);
    }

    compile({proxyStart}: {proxyStart: number | undefined}) {
        if (this.compiled)
            return;

        this.compiled = true;

        const allPathNodes = [];
        const allPathNodesDD = [];

        let lastPathNode = 0;
        let lastPathNodeDD = null;

        for (const segment of this.definition.path) {
            const currentPathNode = this.createNode(0x100, `consuming path`);
            const currentPathNodeDD = this.createNode(0x100, `consuming path (no opts)`);

            this.registerTransition(lastPathNode, segment, currentPathNode);
            this.registerTransition(lastPathNodeDD, segment, currentPathNodeDD);

            this.registerTransition(currentPathNode, `--`, currentPathNodeDD);

            allPathNodes.push(currentPathNode);
            allPathNodesDD.push(currentPathNodeDD);

            lastPathNode = currentPathNode;
            lastPathNodeDD = currentPathNodeDD;
        }

        /* The following block exclusively adds support for -h and --help */ {
            // We can't support -h,--help if a proxy starts immediately after the command
            if (typeof proxyStart === `undefined` || proxyStart >= 1) {
                // This node will allow us to ignore every token coming after -h,--help
                const afterHelpNode = this.createNode(0, `consuming after help`);
                this.markTerminal(afterHelpNode);
                this.registerDynamicTransition(afterHelpNode, always, afterHelpNode);

                // Register the transition from the path to the help
                for (const optName of HELP_OPTIONS)
                    this.registerTransition(lastPathNode, optName, afterHelpNode, generateBoolean);

                // If there are no proxy we can just consume everything until -h,--help
                if (typeof proxyStart === `undefined`) {
                    const searchHelpNode = this.createNode(0, `looking for -h,--help`);

                    this.registerDynamicTransition(lastPathNode, isNotHelpNorSeparator, searchHelpNode);
                    this.registerDynamicTransition(searchHelpNode, isNotHelpNorSeparator, searchHelpNode);

                    for (const optName of HELP_OPTIONS) {
                        this.registerTransition(searchHelpNode, optName, afterHelpNode, generateBoolean);
                    }
                // Otherwise we need to count what we eat so that we don't enter the Proxy Zone™
                } else {
                    const lookAheadSize = proxyStart - this.definition.path.length - this.definition.positionals.minimum - 1;

                    let lastHelpNode = lastPathNode;

                    for (let t = 0; t < lookAheadSize; ++t) {
                        const currentHelpNode = this.createNode(0, `looking for help (${t+1}/${proxyStart})`);

                        this.registerDynamicTransition(lastHelpNode, isPositionalArgument, currentHelpNode);
                        this.registerDynamicTransition(currentHelpNode, isOptionLikeButNotHelp, currentHelpNode);

                        for (const optName of HELP_OPTIONS)
                            this.registerTransition(currentHelpNode, optName, afterHelpNode, generateBoolean);
                        
                        lastHelpNode = currentHelpNode;
                    }
                }

            }
        }

        const allMinNodes = [];
        const allMinNodesDD = [];

        let lastMinNode = lastPathNode;
        let lastMinNodeDD = lastPathNodeDD;

        for (let t = 0; t < this.definition.positionals.minimum; ++t) {
            const currentMinNode = this.createNode(0x1, `consuming required positionals`);
            const currentMinNodeDD = this.createNode(0x1, `consuming required positionals (no opts)`);

            this.registerDynamicTransition(lastMinNode, isPositionalArgument, currentMinNode, generatePositional);
            this.registerDynamicTransition(lastMinNodeDD, always, currentMinNodeDD, generatePositional);

            this.registerTransition(currentMinNode, `--`, currentMinNodeDD);

            allMinNodes.push(currentMinNode);
            allMinNodesDD.push(currentMinNodeDD);

            lastMinNode = currentMinNode;
            lastMinNodeDD = currentMinNodeDD;
        }

        const allMaxNodes = [];
        const allMaxNodesDD = [];

        let lastMaxNode = lastMinNode;
        let lastMaxNodeDD = lastMinNodeDD;

        if (this.definition.positionals.maximum === Infinity) {
            if (this.definition.positionals.proxy) {
                const proxyNode = this.createNode(0, `consuming everything through a proxy`);

                this.markTerminal(proxyNode);

                this.registerDynamicTransition(lastMaxNode, isPositionalArgument, proxyNode, generatePositional);
                this.registerDynamicTransition(lastMaxNode, this.isUnsupportedOption, proxyNode, generatePositional);

                this.registerDynamicTransition(proxyNode, always, proxyNode, generatePositional);

                this.registerTransition(lastMaxNode, `--`, proxyNode);
            } else {
                const currentMaxNode = this.createNode(0, `consuming optional positionals`);
                const currentMaxNodeDD = this.createNode(0, `consuming optional positionals`);

                this.registerDynamicTransition(lastMaxNode, isPositionalArgument, currentMaxNode, generatePositional);
                this.registerDynamicTransition(lastMaxNodeDD, always, currentMaxNodeDD, generatePositional);

                this.registerDynamicTransition(currentMaxNode, isPositionalArgument, currentMaxNode, generatePositional);
                this.registerDynamicTransition(currentMaxNodeDD, always, currentMaxNodeDD, generatePositional);

                this.registerTransition(lastMaxNode, `--`, currentMaxNodeDD);

                allMaxNodes.push(currentMaxNode);
                allMaxNodesDD.push(currentMaxNodeDD);

                lastMaxNode = currentMaxNode;
                lastMaxNodeDD = currentMaxNodeDD;
            }
        } else {
            for (let t = this.definition.positionals.minimum; t < this.definition.positionals.maximum; ++t) {
                const currentMaxNode = this.createNode(0, `consuming optional positionals`);
                const currentMaxNodeDD = this.createNode(0, `consuming optional positionals`);

                this.registerDynamicTransition(lastMaxNode, isPositionalArgument, currentMaxNode, generatePositional);
                this.registerDynamicTransition(lastMaxNodeDD, always, currentMaxNodeDD, generatePositional);

                this.registerTransition(lastMaxNode, `--`, currentMaxNodeDD);

                allMaxNodes.push(currentMaxNode);
                allMaxNodesDD.push(currentMaxNodeDD);

                lastMaxNode = currentMaxNode;
                lastMaxNodeDD = currentMaxNodeDD;
            }
        }

        this.registerOptions(lastPathNode);

        this.markTerminal(lastMinNode);
        this.markTerminal(lastMinNodeDD);

        for (const node of allMaxNodes)
            this.markTerminal(node);
        for (const node of allMaxNodesDD)
            this.markTerminal(node);

        for (const node of allMinNodes)
            this.registerOptions(node);
        for (const node of allMaxNodes) {
            this.registerOptions(node);
        }
    }

    createNode(weight: number, label: string) {
        this.nodes.push({label, weight, terminal: false, transitions: new Map(), dynamics: []});
        return this.nodes.length - 1;
    }

    markTerminal(node: number | null) {
        if (node !== null) {
            this.nodes[node].terminal = true;
        }
    }

    registerTransition(node: number | null, segment: string, target: number, builder?: Builder) {
        if (node !== null) {
            this.nodes[node].transitions.set(segment, {target, builder});
        }
    }

    registerDynamicTransition(node: number | null, condition: (segment: string, ...args: any[]) => any, target: number, builder?: Builder) {
        if (node !== null) {
            this.nodes[node].dynamics.push({condition, target, builder});
        }
    }

    registerOptions(node: number | null) {
        if (node === null)
            return;

        if (this.definition.options.simple.size > 0) {
            this.registerDynamicTransition(node, this.isOptionBatch, node, generateBooleansFromBatch);

            for (const optName of this.definition.options.simple) {
                this.registerTransition(node, optName, node, generateBoolean);
            }
        }

        if (this.definition.options.complex.size > 0) {
            this.registerDynamicTransition(node, this.isInlineOption, node, generateStringFromInline);

            for (const optName of this.definition.options.complex) {
                const argNode = this.createNode(0, `consuming argument`);

                this.registerDynamicTransition(argNode, isPositionalArgument, node, generateString.bind(null, optName));
                this.registerTransition(node, optName, argNode);
            }
        }
    }
}
