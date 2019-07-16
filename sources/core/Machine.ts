import {Command, NODE_ERRORED, NODE_SUCCESS}      from './Command';
import {builders}                                 from './builders';
import {conditions}                               from './conditions';
import {AmbiguousSyntaxError, UnknownSyntaxError} from './errors';
import {DEBUG, Parsed, reconciliateValues}        from './helpers';
import {prettyCommand}                            from './pretty';

type Success<Context> = {command: Command<Context>, parsed: Parsed};
type Failure<Context> = {command: Command<Context>, reason: string | null};

export class Machine<T> {
    private states: State<T>[];

    constructor(commands: Command<T>[]) {
        if (DEBUG)
            console.log(`=== Starting!`);

        this.states = commands.map(command => {
            return new State<T>(command);
        });
    }

    write(segment: string) {
        this._write(segment);

        return this;
    }

    private _write(segment: string | null) {
        if (DEBUG)
            console.log(`=== ${segment}`);

        for (const state of this.states)
            state.write(segment);

        let maxWeight = 0;

        for (const state of this.states)
            for (const {weight} of state.options)
                maxWeight = Math.max(maxWeight, weight);

        for (const state of this.states) {
            state.trimLighterBranches(maxWeight);
        }
    }

    digest() {
        this._write(null);

        const successes: Success<T>[] = [];
        const failures: Failure<T>[] = [];

        for (const state of this.states)
            state.digest({successes, failures});

        if (successes.length < 1)
            throw new UnknownSyntaxError(failures.map(({command, reason}) => [command.definition, reason]));
        if (successes.length > 1)
            throw new AmbiguousSyntaxError(successes.map(({command}) => command.definition));

        const [{command, parsed}] = successes;
        if (DEBUG)
            console.log(`Selected ${prettyCommand(command.definition)}`);

        return command.transform(parsed);
    }
}

class State<T> {
    public options: ({weight: number, node: number, values: any[]})[];

    constructor(public readonly command: Command<T>) {
        this.options = [{weight: 0, node: 0, values: []}];
    }

    write(segment: string | null) {
        if (DEBUG)
            console.log(`  [${prettyCommand(this.command.definition)}]`);

        const options = this.options;
        this.options = [];

        for (const {weight, node, values} of options) {
            const {transitions, dynamics, suggested} = this.command.nodes[node];
            const transition = transitions.get(segment);

            let transitioned = false;

            if (DEBUG)
                console.log(`    ${this.command.nodes[node].label}`)

            if (typeof transition !== `undefined`) {
                transitioned = true;

                const nextValues = typeof transition.builder === `undefined` ? values : values.concat(builders[transition.builder](segment!));
                this.options.push({weight: weight + this.command.nodes[transition.target].weight, node: transition.target, values: nextValues});

                if (DEBUG) {
                    console.log(`      -> ${this.command.nodes[transition.target].label} (static)`);
                }
            }

            if (segment !== null) {
                for (const {condition, target, builder} of dynamics) {
                    if (conditions[condition](segment, this.command.definition)) {
                        if (this.command.nodes[target].suggested)
                            transitioned = true;

                        const nextValues = typeof builder === `undefined` ? values : values.concat(builders[builder](segment));
                        this.options.push({weight: weight + this.command.nodes[target].weight, node: target, values: nextValues});

                        if (DEBUG) {
                            console.log(`      -> ${this.command.nodes[target].label} (dynamic, via ${condition})`);
                        }
                    } else {
                        if (DEBUG) {
                            console.log(`      -> doesn't match ${condition}`);
                        }
                    }
                }
            }

            if (!transitioned && suggested) {
                this.options.push({weight, node: NODE_ERRORED, values: values.concat({reason: `Invalid token "${segment}"`})})
                if (DEBUG) {
                    console.log(`      -> entering an error state`);
                }
            }
        }

        if (DEBUG)
            console.log(`    Went from ${options.length} -> ${this.options.length}`);
        
        return this.options;
    }

    trimLighterBranches(requirement: number) {
        this.options = this.options.filter(({weight}) => weight >= requirement);
    }

    digest({successes, failures}: {successes: Success<T>[], failures: Failure<T>[]}) {
        for (const {node, values} of this.options) {
            switch (node) {
                case NODE_SUCCESS: {
                    successes.push({command: this.command, parsed: reconciliateValues(values)});
                } break;
                case NODE_ERRORED: {
                    failures.push({command: this.command, reason: values[values.length - 1].reason});
                } break;
            }
        }
    }
}
