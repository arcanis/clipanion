import {RecursivePartial}      from '../mpl';

import {builders}               from './builders';
import {conditions}         from './conditions';
import {Parsed, deepMerge}     from './helpers';

export const HELP_OPTIONS = new Set([`-h`, `--help`]);

export const NODE_INITIAL = 0;
export const NODE_SUCCESS = 1;
export const NODE_ERRORED = 2;

export type Node = {
    dynamics: {condition: keyof typeof conditions, target: number, builder?: keyof typeof builders}[];
    label: string;
    suggested: boolean;
    transitions: Map<string | null, {target: number, builder?: keyof typeof builders}>;
    weight: number;
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

export class Command<T> {
    definition: Definition;
    nodes: Node[] = [];

    compiled = false;

    constructor(definition: RecursivePartial<Definition>, public readonly transform: (parsed: Parsed) => T) {
        this.definition = deepMerge({}, DEFAULT_COMMAND_OPTIONS, definition) as Definition;
    }

    compile({proxyStart}: {proxyStart: number | undefined}) {
        if (this.compiled)
            return;

        this.createNode({weight: 0, label: `initial`});
        this.createNode({weight: 0, label: `success`});
        this.createNode({weight: 0, label: `errored`});

        // We can't ever leave the error state, even at the end of the line
        this.registerDynamicTransition(NODE_ERRORED, `always`, NODE_ERRORED);
        this.registerTransition(NODE_ERRORED, null, NODE_ERRORED);

        this.compiled = true;

        const initialDD = this.createNode({weight: 0, label: `initial (no opts)`});

        this.registerTransition(0, `--`, initialDD);

        const allPathNodes = [];
        const allPathNodesDD = [];

        let lastPathNode = NODE_INITIAL;
        let lastPathNodeDD = initialDD;

        for (const segment of this.definition.path) {
            const currentPathNode = this.createNode({weight: 0x100, label: `consuming path`});
            const currentPathNodeDD = this.createNode({weight: 0x100, label: `consuming path (no opts)`});

            this.registerTransition(lastPathNode, segment, currentPathNode);
            this.registerTransition(lastPathNodeDD, segment, currentPathNodeDD);

            this.registerTransition(currentPathNode, `--`, currentPathNodeDD);

            allPathNodes.push(currentPathNode);
            allPathNodesDD.push(currentPathNodeDD);

            lastPathNode = currentPathNode;
            lastPathNodeDD = currentPathNodeDD;
        }

        if (this.definition.positionals.minimum > 0)
            this.registerTransition(lastPathNode, null, NODE_ERRORED, `generateMissingPositionalArgument`);

        const allMinNodes = [];
        const allMinNodesDD = [];

        let lastMinNode = lastPathNode;
        let lastMinNodeDD = lastPathNodeDD;

        for (let t = 0; t < this.definition.positionals.minimum; ++t) {
            const currentMinNode = this.createNode({weight: 0x1, label: `consuming required positionals`});
            const currentMinNodeDD = this.createNode({weight: 0x1, label: `consuming required positionals (no opts)`});

            this.registerDynamicTransition(lastMinNode, `isPositionalArgument`, currentMinNode, `generatePositional`);
            this.registerDynamicTransition(lastMinNodeDD, `always`, currentMinNodeDD, `generatePositional`);

            if (t + 1 < this.definition.positionals.minimum)
                this.registerTransition(currentMinNode, null, NODE_ERRORED, `generateMissingPositionalArgument`);

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
                const proxyNode = this.createNode({weight: 0, label: `consuming everything through a proxy`});

                this.markTerminal(proxyNode);

                this.registerDynamicTransition(lastMaxNode, `isPositionalArgument`, proxyNode, `generatePositional`);
                this.registerDynamicTransition(lastMaxNode, `isUnsupportedOption`, proxyNode, `generatePositional`);

                this.registerDynamicTransition(proxyNode, `always`, proxyNode, `generatePositional`);

                this.registerTransition(lastMaxNode, `--`, proxyNode);
            } else {
                const currentMaxNode = this.createNode({weight: 0, label: `consuming optional positionals`});
                const currentMaxNodeDD = this.createNode({weight: 0, label: `consuming optional positionals`});

                this.registerDynamicTransition(lastMaxNode, `isPositionalArgument`, currentMaxNode, `generatePositional`);
                this.registerDynamicTransition(lastMaxNodeDD, `always`, currentMaxNodeDD, `generatePositional`);

                this.registerDynamicTransition(currentMaxNode, `isPositionalArgument`, currentMaxNode, `generatePositional`);
                this.registerDynamicTransition(currentMaxNodeDD, `always`, currentMaxNodeDD, `generatePositional`);

                this.registerTransition(lastMaxNode, `--`, currentMaxNodeDD);

                allMaxNodes.push(currentMaxNode);
                allMaxNodesDD.push(currentMaxNodeDD);

                lastMaxNode = currentMaxNode;
                lastMaxNodeDD = currentMaxNodeDD;
            }
        } else {
            for (let t = this.definition.positionals.minimum; t < this.definition.positionals.maximum; ++t) {
                const currentMaxNode = this.createNode({weight: 0, label: `consuming optional positionals`});
                const currentMaxNodeDD = this.createNode({weight: 0, label: `consuming optional positionals`});

                this.registerDynamicTransition(lastMaxNode, `isPositionalArgument`, currentMaxNode, `generatePositional`);
                this.registerDynamicTransition(lastMaxNodeDD, `always`, currentMaxNodeDD, `generatePositional`);

                this.registerTransition(lastMaxNode, `--`, currentMaxNodeDD);

                allMaxNodes.push(currentMaxNode);
                allMaxNodesDD.push(currentMaxNodeDD);

                lastMaxNode = currentMaxNode;
                lastMaxNodeDD = currentMaxNodeDD;
            }
        }

        this.registerDynamicTransition(lastMaxNode, `isPositionalArgument`, NODE_ERRORED, `generateExtraneousPositionalArgument`);
        this.registerDynamicTransition(lastMaxNodeDD, `always`, NODE_ERRORED, `generateExtraneousPositionalArgument`);

        /* The following block exclusively adds support for -h and --help */ {
            // We can't support -h,--help if a proxy starts immediately after the command
            if (typeof proxyStart === `undefined` || proxyStart >= 1) {
                // This node will allow us to ignore every token coming after -h,--help
                const afterHelpNode = this.createNode({weight: 0, label: `consuming after help`, suggested: false});
                this.markTerminal(afterHelpNode);
                this.registerDynamicTransition(afterHelpNode, `always`, afterHelpNode);

                // Register the transition from the path to the help
                for (const optName of HELP_OPTIONS)
                    this.registerTransition(lastPathNode, optName, afterHelpNode, `generateBoolean`);

                // Same thing for the mandatory positional arguments, but we give them some weight
                for (let t = 0; t < this.definition.positionals.minimum; ++t) {
                    for (const optName of HELP_OPTIONS) {
                        // Note that we don't add this transition to allMinNodesDD, since we don't want to find -h,--help if behind --
                        this.registerTransition(allMinNodes[t], optName, afterHelpNode, `generateBoolean`);
                    }
                }

                // If there are no proxy we can just consume everything until -h,--help
                if (typeof proxyStart === `undefined`) {
                    const searchHelpNode = this.createNode({weight: 0, label: `looking for -h,--help`, suggested: false});

                    this.registerDynamicTransition(lastMinNode, `isUnsupportedOption`, searchHelpNode);
                    this.registerDynamicTransition(lastMaxNode, `isPositionalArgument`, searchHelpNode);
                    this.registerDynamicTransition(searchHelpNode, `isNotHelpNorSeparator`, searchHelpNode);

                    for (const optName of HELP_OPTIONS) {
                        this.registerTransition(searchHelpNode, optName, afterHelpNode, `generateBoolean`);
                    }
                // Otherwise we need to count what we eat so that we don't enter the Proxy Zone™
                } else {
                    const lookAheadSize = proxyStart - this.definition.path.length - this.definition.positionals.minimum - 1;

                    let lastHelpNode = lastPathNode;

                    for (let t = 0; t < lookAheadSize; ++t) {
                        const currentHelpNode = this.createNode({weight: 0, label: `looking for help (${t+1}/${proxyStart})`, suggested: false});

                        this.registerDynamicTransition(lastHelpNode, `isPositionalArgument`, currentHelpNode);
                        this.registerDynamicTransition(currentHelpNode, `isOptionLikeButNotHelp`, currentHelpNode);

                        for (const optName of HELP_OPTIONS)
                            this.registerTransition(currentHelpNode, optName, afterHelpNode, `generateBoolean`);
                        
                        lastHelpNode = currentHelpNode;
                    }
                }

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

    createNode({weight, label, suggested = true}: {weight: number, label: string, suggested?: boolean}) {
        this.nodes.push({label, suggested, weight, transitions: new Map(), dynamics: []});
        return this.nodes.length - 1;
    }

    markTerminal(node: number | null) {
        this.registerTransition(node, null, 1);
    }

    registerTransition(node: number | null, segment: string | null, target: number, builder?: keyof typeof builders) {
        if (node !== null) {
            this.nodes[node].transitions.set(segment, {target, builder});
        }
    }

    registerDynamicTransition(node: number | null, condition: keyof typeof conditions, target: number, builder?: keyof typeof builders) {
        if (node !== null) {
            this.nodes[node].dynamics.push({condition, target, builder});
        }
    }

    registerOptions(node: number | null) {
        if (node === null)
            return;

        this.registerDynamicTransition(node, `isUnsupportedOption`, NODE_ERRORED, `generateUnsupportedOption`);

        if (this.definition.options.simple.size > 0) {
            this.registerDynamicTransition(node, `isOptionBatch`, node, `generateBooleansFromBatch`);

            for (const optName of this.definition.options.simple) {
                this.registerTransition(node, optName, node, `generateBoolean`);
            }
        }

        if (this.definition.options.complex.size > 0) {
            this.registerDynamicTransition(node, `isInlineOption`, node, `generateStringFromInline`);

            for (const optName of this.definition.options.complex) {
                const argNode = this.createNode({weight: 0, label: `consuming argument`});

                this.registerDynamicTransition(argNode, `isPositionalArgument`, node, `generateStringValue`);
                this.registerTransition(node, optName, argNode, `generateStringKey`);
            }
        }
    }
}
