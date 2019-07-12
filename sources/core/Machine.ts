import {Command}                   from './Command';
import {AmbiguousSyntaxError}      from './errors';
import {DEBUG, reconciliateValues} from './helpers';
import {prettyCommand}             from './pretty';

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
        if (DEBUG)
            console.log(`=== ${segment}`);

        let maxWeight = 0;

        for (const state of this.states)
            maxWeight = Math.max(maxWeight, state.write(segment));

        for (const state of this.states) {
            state.trimLighterBranches(maxWeight);
        }
    }

    digest() {
        const candidates = [];

        for (const state of this.states)
            for (const candidate of state.digest())
                candidates.push(candidate);

        if (candidates.length < 1)
            throw new Error(`No matches`);
        if (candidates.length > 1)
            throw new AmbiguousSyntaxError(candidates.map(({command}) => command.definition));

        const [{command, parsed}] = candidates;
        if (DEBUG)
            console.log(`Selected ${prettyCommand(command.definition)}`);

        return command.transform(parsed);
    }
}

class State<T> {
    private options: ({weight: number, node: number, values: any[]})[];

    constructor(private readonly command: Command<T>) {
        this.options = [{weight: 0, node: 0, values: []}];
    }

    write(segment: string) {
        if (DEBUG)
            console.log(`  ${prettyCommand(this.command.definition)}`);

        const options = this.options;
        this.options = [];

        for (const {weight, node, values} of options) {
            const {transitions, dynamics, terminal} = this.command.nodes[node];
            const transition = transitions.get(segment);

            if (DEBUG)
                console.log(`    ${this.command.nodes[node].label}`)

            if (typeof transition !== `undefined`) {
                const nextValues = typeof transition.builder === `undefined` ? values : values.concat(transition.builder(segment));
                this.options.push({weight: weight + this.command.nodes[transition.target].weight, node: transition.target, values: nextValues});

                if (DEBUG) {
                    console.log(`      -> ${this.command.nodes[transition.target].label} (static)`);
                }
            }

            for (const {condition, target, builder} of dynamics) {
                if (condition(segment)) {
                    const nextValues = typeof builder === `undefined` ? values : values.concat(builder(segment));
                    this.options.push({weight: weight + this.command.nodes[target].weight, node: target, values: nextValues});

                    if (DEBUG) {
                        console.log(`      -> ${this.command.nodes[target].label} (dynamic, via ${condition.name})`);
                    }
                } else {
                    if (DEBUG) {
                        console.log(`      -> doesn't match ${condition.name}`);
                    }
                }
            }
        }

        if (DEBUG)
            console.log(`    Went from ${options.length} -> ${this.options.length}`);

        let maxWeight = 0;

        for (const option of this.options)
            maxWeight = Math.max(maxWeight, option.weight);

        return maxWeight;
    }

    trimLighterBranches(requirement: number) {
        this.options = this.options.filter(({weight}) => weight >= requirement);
    }

    digest() {
        const candidates = [];

        for (const {node, values} of this.options)
            if (this.command.nodes[node].terminal)
                candidates.push({command: this.command, parsed: reconciliateValues(values)});

        return candidates;
    }
}
