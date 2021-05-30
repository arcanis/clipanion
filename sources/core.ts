import {CompletionResults, RichCompletionResult, CompletionRequest} from 'clcs';

import * as errors                                                  from './errors';

import {
  BATCH_REGEX, BINDING_REGEX, END_OF_INPUT,
  HELP_COMMAND_INDEX, HELP_REGEX, NODE_ERRORED,
  NODE_INITIAL, NODE_SUCCESS, OPTION_REGEX, SHORT_OPTION_REGEX, LONG_OPTION_REGEX,
  START_OF_INPUT, DEBUG, CompletionType,
} from './constants';

declare const console: any;

export function identity<T>(arg: T) {
  return arg;
}

// ------------------------------------------------------------------------

export function debug(str: string) {
  if (DEBUG) {
    console.log(str);
  }
}

// ------------------------------------------------------------------------

/**
 * A partial `CompletionRequest` that can be used with `Cli.prototype.complete`. Needs to include at least 2 properties.
 */
export type PartialCompletionRequest = Omit<CompletionRequest, 'current'> | Omit<CompletionRequest, 'prefix'> | Omit<CompletionRequest, 'suffix'>;

/**
 * @internal Only exists because the core doesn't know about the `Command` class
 */
type CompletionFunction = (request: CompletionRequest, ...args: Array<any>) => CompletionResults;

/**
 * @internal Set by the state machine
 */
type CoreCompletion = {fn: CompletionFunction, request: CompletionRequest, type: CompletionType};

// ------------------------------------------------------------------------

export type StateMachine = {
  nodes: Array<Node>;
};

export type RunState = {
  candidateUsage: string | null;
  requiredOptions: Array<Array<string>>;
  errorMessage: string | null;
  ignoreOptions: boolean;
  options: Array<{name: string, value: any}>;
  path: Array<string>;
  positionals: Array<{value: string, extra: boolean | typeof NoLimits}>;
  remainder: string | null;
  selectedIndex: number | null;
  completion: CoreCompletion | null;
};

const basicHelpState: RunState = {
  candidateUsage: null,
  requiredOptions: [],
  errorMessage: null,
  ignoreOptions: false,
  path: [],
  positionals: [],
  options: [],
  remainder: null,
  selectedIndex: HELP_COMMAND_INDEX,
  // TODO: find a way to not leak the HelpCommand into the core
  completion: {
    fn: (request, helpCommand) => helpCommand.completions(),
    request: {
      current: ``,
      prefix: ``,
      suffix: ``,
    },
    type: CompletionType.HelpIndex,
  },
};

export function makeStateMachine(): StateMachine {
  return {
    nodes: [makeNode(), makeNode(), makeNode()],
  };
}

export function makeAnyOfMachine(inputs: Array<StateMachine>) {
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
        const store = !Object.prototype.hasOwnProperty.call(nodeDef.statics, segment)
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
  // Don't iterate unless it's needed
  if (DEBUG) {
    debug(`${prefix}Nodes are:`);
    for (let t = 0; t < machine.nodes.length; ++t) {
      debug(`${prefix}  ${t}: ${JSON.stringify(machine.nodes[t])}`);
    }
  }
}

export function runMachineInternal(machine: StateMachine, input: Array<string>, {completionCursorPosition}: {completionCursorPosition?: number} = {}) {
  debug(`Running a vm on ${JSON.stringify(input)}`);
  let branches: Array<{node: number, state: RunState}> = [{node: NODE_INITIAL, state: {
    candidateUsage: null,
    requiredOptions: [],
    errorMessage: null,
    ignoreOptions: false,
    options: [],
    path: [],
    positionals: [],
    remainder: null,
    selectedIndex: null,
    completion: null,
  }}];

  debugMachine(machine, {prefix: `  `});

  const isCompletionMode = typeof completionCursorPosition !== `undefined`;

  let cursorPosition = -(START_OF_INPUT.length + 1);

  const tokens = [START_OF_INPUT, ...input];
  for (let t = 0; t < tokens.length; ++t) {
    const segment = tokens[t];

    const shouldCompleteToken = typeof completionCursorPosition !== `undefined`
      && completionCursorPosition >= cursorPosition
      && completionCursorPosition < cursorPosition + segment.length + 1;

    const cursorPositionInSegment = shouldCompleteToken
      ? completionCursorPosition! - cursorPosition
      : undefined;

    const current: Current = {
      segment,
      cursorPosition: cursorPositionInSegment,
    };

    debug(`  Processing ${JSON.stringify(segment)}`);
    const nextBranches: Array<{node: number, state: RunState}> = [];

    for (const {node, state} of branches) {
      debug(`    Current node is ${node}`);
      const nodeDef = machine.nodes[node];

      if (node === NODE_SUCCESS || node === NODE_ERRORED) {
        nextBranches.push({node, state});
        continue;
      }

      console.assert(
        nodeDef.shortcuts.length === 0,
        `Shortcuts should have been eliminated by now`,
      );

      const hasExactMatch = Object.prototype.hasOwnProperty.call(nodeDef.statics, segment);
      if (hasExactMatch) {
        const transitions = nodeDef.statics[segment];
        for (const {to, reducer} of transitions) {
          nextBranches.push({node: to, state: typeof reducer !== `undefined` ? execute(reducers, reducer, state, current) : state});
          debug(`      Static transition to ${to} found`);
        }
      } else {
        debug(`      No static transition found`);
      }

      if (segment !== END_OF_INPUT) {
        for (const [test, {to, reducer}] of nodeDef.dynamics) {
          if (execute(tests, test, state, current)) {
            nextBranches.push({node: to, state: typeof reducer !== `undefined` ? execute(reducers, reducer, state, current) : state});
            debug(`      Dynamic transition to ${to} found (via ${test})`);
          }
        }
      }
    }

    if (nextBranches.length === 0 && segment === END_OF_INPUT && input.length === 1) {
      return [{
        node: NODE_INITIAL,
        state: basicHelpState,
      }];
    }

    if (nextBranches.length === 0) {
      throw new errors.UnknownSyntaxError(input, branches.filter(({node}) => {
        return node !== NODE_ERRORED;
      }).map(({state}) => {
        return {usage: state.candidateUsage!, reason: null};
      }));
    }

    if (!isCompletionMode && nextBranches.every(({node}) => node === NODE_ERRORED)) {
      throw new errors.UnknownSyntaxError(input, nextBranches.map(({state}) => {
        return {usage: state.candidateUsage!, reason: state.errorMessage};
      }));
    }

    branches = trimSmallerBranches(nextBranches);

    cursorPosition += segment.length + 1;
  }

  if (branches.length > 0) {
    debug(`  Results:`);
    for (const branch of branches) {
      debug(`    - ${branch.node} -> ${JSON.stringify(branch.state)}`);
    }
  } else {
    debug(`  No results`);
  }

  return branches;
}

function runMachine(machine: StateMachine, input: Array<string>) {
  const branches = runMachineInternal(machine, [...input, END_OF_INPUT]);

  return selectBestState(input, branches.map(({state}) => {
    return state;
  }));
}

function normalizePartialCompletionRequest(request: PartialCompletionRequest): CompletionRequest {
  const normalizedRequest = (() => {
    if (`current` in request && `prefix` in request) {
      return {
        ...request,
        suffix: request.current.slice(request.prefix.length),
      };
    }

    if (`current` in request && `suffix` in request) {
      return {
        ...request,
        prefix: request.current.slice(0, request.suffix.length),
      };
    }

    if (`prefix` in request && `suffix` in request) {
      return {
        ...request,
        current: request.prefix + request.suffix,
      };
    }

    throw new Error(`Invalid completion request`);
  })();

  if (!normalizedRequest.current.startsWith(normalizedRequest.prefix))
    throw new Error(`Invalid completion request: "prefix" doesn't match the start of "current"`);

  if (!normalizedRequest.current.endsWith(normalizedRequest.suffix))
    throw new Error(`Invalid completion request: "suffix" doesn't match the end of "current"`);

  return normalizedRequest;
}

function completeMachine(machine: StateMachine, request: PartialCompletionRequest) {
  const normalizedRequest = normalizePartialCompletionRequest(request);

  const branches = runMachineInternal(machine, [...normalizedRequest.current.split(` `), END_OF_INPUT], {completionCursorPosition: normalizedRequest.prefix.length});

  return aggregateHelpStates(branches.map(({state}) => {
    return state;
  }));
}

export function trimSmallerBranches(branches: Array<{node: number, state: RunState}>) {
  let maxPathSize = 0;
  for (const {state} of branches)
    if (state.path.length > maxPathSize)
      maxPathSize = state.path.length;

  return branches.filter(({state}) => {
    return state.path.length === maxPathSize;
  });
}

export function selectBestState(input: Array<string>, states: Array<RunState>) {
  const terminalStates = states.filter(state => {
    return state.selectedIndex !== null;
  });

  if (terminalStates.length === 0)
    throw new Error();

  const requiredOptionsSetStates = terminalStates.filter(state =>
    state.requiredOptions.every(names =>
      names.some(name =>
        state.options.find(opt => opt.name === name)
      )
    )
  );

  if (requiredOptionsSetStates.length === 0) {
    throw new errors.UnknownSyntaxError(input, terminalStates.map(state => ({
      usage: state.candidateUsage!,
      reason: null,
    })));
  }

  let maxPathSize = 0;
  for (const state of requiredOptionsSetStates)
    if (state.path.length > maxPathSize)
      maxPathSize = state.path.length;

  const bestPathBranches = requiredOptionsSetStates.filter(state => {
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
    throw new errors.AmbiguousSyntaxError(input, fixedStates.map(state => state.candidateUsage!));

  return fixedStates[0];
}

export function aggregateHelpStates(states: Array<RunState>) {
  const notHelps: Array<RunState> = [];
  const helps: Array<RunState> = [];

  for (const state of states) {
    if (state.selectedIndex === HELP_COMMAND_INDEX) {
      helps.push(state);
    } else {
      notHelps.push(state);
    }
  }

  if (helps.length > 0) {
    notHelps.push({
      ...basicHelpState,
      path: findCommonPrefix(...helps.map(state => state.path)),
      options: helps.reduce((options, state) => options.concat(state.options), [] as RunState['options']),
    });
  }

  return notHelps;
}

function findCommonPrefix(...paths: Array<Array<string>>): Array<string>;
function findCommonPrefix(firstPath: Array<string>, secondPath: Array<string>|undefined, ...rest: Array<Array<string>>): Array<string> {
  if (secondPath === undefined)
    return Array.from(firstPath);

  return findCommonPrefix(
    firstPath.filter((segment, i) => segment === secondPath[i]),
    ...rest
  );
}

// ------------------------------------------------------------------------

type Transition = {
  to: number;
  reducer?: Callback<keyof typeof reducers, typeof reducers>;
};

type Node = {
  dynamics: Array<[Callback<keyof typeof tests, typeof tests>, Transition]>;
  shortcuts: Array<Transition>;
  statics: {[segment: string]: Array<Transition>};
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

export function registerDynamic<T extends keyof typeof tests, R extends keyof typeof reducers>(machine: StateMachine, from: number, test: Callback<T, typeof tests>, to: number, reducer?: Callback<R, typeof reducers>) {
  machine.nodes[from].dynamics.push([
    test as Callback<keyof typeof tests, typeof tests>,
    {to, reducer: reducer as Callback<keyof typeof reducers, typeof reducers>},
  ]);
}

export function registerShortcut<R extends keyof typeof reducers>(machine: StateMachine, from: number, to: number, reducer?: Callback<R, typeof reducers>) {
  machine.nodes[from].shortcuts.push(
    {to, reducer: reducer as Callback<keyof typeof reducers, typeof reducers>}
  );
}

export function registerStatic<R extends keyof typeof reducers>(machine: StateMachine, from: number, test: string, to: number, reducer?: Callback<R, typeof reducers>) {
  const store = !Object.prototype.hasOwnProperty.call(machine.nodes[from].statics, test)
    ? machine.nodes[from].statics[test] = []
    : machine.nodes[from].statics[test];

  store.push({to, reducer: reducer as Callback<keyof typeof reducers, typeof reducers>});
}

// ------------------------------------------------------------------------

type UndefinedKeys<T> = {[P in keyof T]-?: undefined extends T[P] ? P : never}[keyof T];
type UndefinedTupleKeys<T extends Array<unknown>> = UndefinedKeys<Omit<T, keyof []>>;
type TupleKeys<T> = Exclude<keyof T, keyof []>;

type Current = {segment: string, cursorPosition?: number};

export type CallbackFn<P extends Array<any>, R> = (state: RunState, current: Current, ...args: P) => R;
export type CallbackFnParameters<T extends CallbackFn<any, any>> = T extends ((state: RunState, current: Current, ...args: infer P) => any) ? P : never;
export type CallbackStore<T extends string, R> = Record<T, CallbackFn<any, R>>;
export type Callback<T extends string, S extends CallbackStore<T, any>> =
    [TupleKeys<CallbackFnParameters<S[T]>>] extends [UndefinedTupleKeys<CallbackFnParameters<S[T]>>]
      ? (T | [T, ...CallbackFnParameters<S[T]>])
      : [T, ...CallbackFnParameters<S[T]>];

export function execute<T extends string, R, S extends CallbackStore<T, R>>(store: S, callback: Callback<T, S>, state: RunState, current: Current) {
  // TypeScript's control flow can't properly narrow
  // generic conditionals for some mysterious reason
  if (Array.isArray(callback)) {
    const [name, ...args] = callback as [T, ...CallbackFnParameters<S[T]>];
    return store[name](state, current, ...args);
  } else {
    return store[callback as T](state, current);
  }
}

export const tests = {
  all: (state: RunState, current: Current, all: Array<Callback<any, any>>) => {
    return all.every(test => execute(tests, test, state, current));
  },
  always: () => {
    return true;
  },
  isOptionLike: (state: RunState, {segment}: Current) => {
    return !state.ignoreOptions && segment.startsWith(`-`);
  },
  isNotOptionLike: (state: RunState, {segment}: Current) => {
    return state.ignoreOptions || !segment.startsWith(`-`);
  },
  isOption: (state: RunState, {segment}: Current, name: string, hidden?: boolean) => {
    return !state.ignoreOptions && segment === name;
  },
  isLongOption: (state: RunState, {segment}: Current, name: string, hidden?: boolean) => {
    return !state.ignoreOptions && segment === name && LONG_OPTION_REGEX.test(name);
  },
  isShortOption: (state: RunState, {segment}: Current, name: string, hidden?: boolean) => {
    return !state.ignoreOptions && segment === name && SHORT_OPTION_REGEX.test(name);
  },
  isBatchOption: (state: RunState, {segment}: Current, names: Array<string>) => {
    return !state.ignoreOptions && BATCH_REGEX.test(segment) && [...segment.slice(1)].every(name => names.includes(`-${name}`));
  },
  isBoundOption: (state: RunState, {segment}: Current, names: Array<string>, options: Array<OptDefinition>) => {
    const optionParsing = segment.match(BINDING_REGEX);
    return !state.ignoreOptions && !!optionParsing && OPTION_REGEX.test(optionParsing[1]) && names.includes(optionParsing[1])
            // Disallow bound options with no arguments (i.e. booleans)
            && options.filter(opt => opt.names.includes(optionParsing[1])).every(opt => opt.allowBinding);
  },
  isNegatedOption: (state: RunState, {segment}: Current, name: string) => {
    return !state.ignoreOptions && segment === `--no-${name.slice(2)}`;
  },
  isHelp: (state: RunState, {segment}: Current) => {
    return !state.ignoreOptions && HELP_REGEX.test(segment);
  },
  isUnsupportedOption: (state: RunState, {segment}: Current, names: Array<string>) => {
    return !state.ignoreOptions && segment.startsWith(`-`) && OPTION_REGEX.test(segment) && !names.includes(segment);
  },
  isUnsupportedBatchOption: (state: RunState, {segment}: Current, names: Array<string>) => {
    return !state.ignoreOptions && BATCH_REGEX.test(segment) && ![...segment.slice(1)].every(name => names.includes(`-${name}`));
  },
  isUnsupportedBoundOption: (state: RunState, {segment}: Current, names: Array<string>, options: Array<OptDefinition>) => {
    const optionParsing = segment.match(BINDING_REGEX);

    return !state.ignoreOptions && !!optionParsing && OPTION_REGEX.test(optionParsing[1]) && (
      !names.includes(optionParsing[1])
      || options.filter(opt => opt.names.includes(optionParsing[1])).some(opt => !opt.allowBinding)
    );
  },
  isInvalidOption: (state: RunState, {segment}: Current) => {
    return !state.ignoreOptions && segment.startsWith(`-`) && !OPTION_REGEX.test(segment) && !BATCH_REGEX.test(segment) && !BINDING_REGEX.test(segment);
  },
  isCompletion: (state: RunState, {cursorPosition}: Current) => {
    return typeof cursorPosition === `number`;
  },
};

export const reducers = {
  chain: (state: RunState, current: Current, chain: Array<Callback<any, any>>) => {
    return chain.reduce((state, reducer) => execute(reducers, reducer, state, current), state);
  },
  setCandidateState: (state: RunState, {segment}: Current, candidateState: Partial<RunState>) => {
    return {...state, ...candidateState};
  },
  setSelectedIndex: (state: RunState, {segment}: Current, index: number) => {
    return {...state, selectedIndex: index};
  },
  pushBatch: (state: RunState, {segment}: Current) => {
    return {...state, options: state.options.concat([...segment.slice(1)].map(name => ({name: `-${name}`, value: true})))};
  },
  pushBound: (state: RunState, {segment}: Current) => {
    const [, name, value] = segment.match(BINDING_REGEX)!;
    return {...state, options: state.options.concat({name, value})};
  },
  pushPath: (state: RunState, {segment}: Current) => {
    return {...state, path: state.path.concat(segment)};
  },
  pushPositional: (state: RunState, {segment}: Current) => {
    return {...state, positionals: state.positionals.concat({value: segment, extra: false})};
  },
  pushExtra: (state: RunState, {segment}: Current) => {
    return {...state, positionals: state.positionals.concat({value: segment, extra: true})};
  },
  pushExtraNoLimits: (state: RunState, {segment}: Current) => {
    return {...state, positionals: state.positionals.concat({value: segment, extra: NoLimits})};
  },
  pushTrue: (state: RunState, {segment}: Current, name: string = segment) => {
    return {...state, options: state.options.concat({name: segment, value: true})};
  },
  pushFalse: (state: RunState, {segment}: Current, name: string = segment) => {
    return {...state, options: state.options.concat({name, value: false})};
  },
  pushUndefined: (state: RunState, {segment}: Current) => {
    return {...state, options: state.options.concat({name: segment, value: undefined})};
  },
  pushStringValue: (state: RunState, {segment}: Current) => {
    const copy = {...state, options: [...state.options]};
    const lastOption = state.options[state.options.length - 1];
    lastOption.value = (lastOption.value ?? []).concat([segment]);
    return copy;
  },
  setStringValue: (state: RunState, {segment}: Current) => {
    const copy = {...state, options: [...state.options]};
    const lastOption = state.options[state.options.length - 1];
    lastOption.value = segment;
    return copy;
  },
  inhibateOptions: (state: RunState) => {
    return {...state, ignoreOptions: true};
  },
  useHelp: (state: RunState, {segment}: Current, command: number) => {
    const [, /* name */, index] = segment.match(HELP_REGEX)!;

    if (typeof index !== `undefined` && index !== ``) {
      return {...state, options: [{name: `-c`, value: String(command)}, {name: `-i`, value: index}]};
    } else {
      return {...state, options: [{name: `-c`, value: String(command)}]};
    }
  },
  setError: (state: RunState, {segment}: Current, errorMessage: string) => {
    if (segment === END_OF_INPUT) {
      return {...state, errorMessage: `${errorMessage}.`};
    } else {
      return {...state, errorMessage: `${errorMessage} ("${segment}").`};
    }
  },
  setUnsupportedBatchOptionError: (state: RunState, {segment}: Current, names: Array<string>) => {
    const unsupportedNames = [...segment.slice(1)]
      .filter(name => !names.includes(`-${name}`))
      .map(name => `"-${name}"`);

    return {...state, errorMessage: `Unsupported option name${unsupportedNames.length > 1 ? `s` : ``} (${unsupportedNames.join(`, `)}).`};
  },
  setUnsupportedBoundOptionError: (state: RunState, {segment}: Current, options: Array<OptDefinition>) => {
    const [, name] = segment.match(BINDING_REGEX)!;

    if (options.filter(opt => opt.names.includes(name)).some(opt => !opt.allowBinding))
      return {...state, errorMessage: `Unsupported binding ("${segment}").`};

    return {...state, errorMessage: `Unsupported option name ("${name}").`};
  },
  setOptionArityError: (state: RunState, {segment}: Current) => {
    const lastOption = state.options[state.options.length - 1];

    return {...state, errorMessage: `Not enough arguments to option ${lastOption.name}.`};
  },
  setCompletion: (state: RunState, {segment, cursorPosition}: Current, type: CompletionType, completion: CompletionFunction, index: number) => {
    if (!tests.isCompletion(state, {segment, cursorPosition}))
      return state;

    return {
      ...state,
      completion: {
        fn: completion,
        request: {
          current: segment,
          prefix: segment.slice(0, cursorPosition),
          suffix: segment.slice(cursorPosition),
        },
        type,
      },
      selectedIndex: index,
    };
  },
  setBatchCompletion: (state: RunState, {segment, cursorPosition}: Current, builder: CommandBuilder<any>) => {
    if (!tests.isCompletion(state, {segment, cursorPosition}))
      return state;

    const completionWrapperFn: CompletionFunction = ({prefix, suffix}) => {
      const completions = builder.getOptionNameCompletionResults({onlyBatch: true});
      const lastOptionCompletion = prefix.length > 1
        ? completions.find(completionResult => completionResult.completionText.slice(1) === prefix[prefix.length - 1])!
        : null;

      // Since batches aren't suggested unless the user types at least one batch component,
      // it means that the user either wants to validate the typed component or add new elements
      // to the batch. Because of this, we suggest the current component and all ways to add more
      // relevant components to the batch.
      return [
        ...lastOptionCompletion ? [{...lastOptionCompletion, completionText: segment}] : [],
        ...completions
          .filter(completionResult => !segment.includes(completionResult.completionText.slice(1)))
          .map(completionResult => ({
            ...completionResult,
            completionText: `${prefix}${completionResult.completionText.slice(1)}${suffix}`,
          })),
      ];
    };

    return reducers.setCompletion(state, {segment, cursorPosition}, CompletionType.OptionName, completionWrapperFn, builder.cliIndex);
  },
  setBoundCompletion: (state: RunState, {segment, cursorPosition}: Current, builder: CommandBuilder<any>) => {
    if (!tests.isCompletion(state, {segment, cursorPosition}))
      return state;

    const [, name, value] = segment.match(BINDING_REGEX)!;

    const binding = `${name}=`;

    if (cursorPosition! < binding.length) {
      const completionWrapperFn = ({prefix}: CompletionRequest) =>
        builder
          .getOptionNameCompletionResults({onlyBound: true, negated: prefix.startsWith(`--no-`)})
          .map(completionResult => ({
            ...completionResult,
            completionText: `${completionResult.completionText}=${value}`,
          }));

      return reducers.setCompletion(state, {segment: name, cursorPosition}, CompletionType.OptionName, completionWrapperFn, builder.cliIndex);
    }

    const completions = builder.options.filter(opt => opt.names.includes(name)).map(opt => opt.completion);
    if (completions.length === 0)
      return state;
    if (completions.length > 1)
      throw new Error(`Assertion failed: Expected a single completion for option "${name}"`);

    const [completion] = completions;
    if (typeof completion === `undefined`)
      return state;

    const completionWrapperFn: CompletionFunction = async (request, ...args) => {
      const result = await (completion as CompletionFunction)(request, ...args);
      const results = Array.isArray(result) ? result : [result];

      return results.map(result => typeof result === `string` ? `${binding}${result}` : {
        ...result,
        completionText: `${binding}${result.completionText}`,
      });
    };

    return reducers.setCompletion(state, {segment: value, cursorPosition: cursorPosition! - binding.length}, CompletionType.OptionValue, completionWrapperFn, builder.cliIndex);
  },
};

// ------------------------------------------------------------------------
export const NoLimits = Symbol();
export type AritySubdefinition = {name: string, completion?: CompletionFunction};
export type ArityDefinition = {
  leading: Array<AritySubdefinition>;
  extra: Array<AritySubdefinition> | typeof NoLimits;
  trailing: Array<AritySubdefinition>;
  proxy: boolean;
  // Making NoLimits extra an object with a completion property complicates the code by a lot
  extraCompletion?: CompletionFunction;
};

export type OptDefinition = {
  names: Array<string>;
  longNames: Array<string>;
  shortNames: Array<string>;
  description?: string;
  arity: number;
  hidden: boolean;
  required: boolean;
  allowBinding: boolean;
  completion?: CompletionFunction | Array<CompletionFunction>;
};

export class CommandBuilder<Context> {
  public readonly cliIndex: number;
  public readonly cliOpts: Readonly<CliOptions>;

  public readonly allOptionNames: Array<string> = [];
  public readonly arity: ArityDefinition = {leading: [], trailing: [], extra: [], proxy: false};
  public readonly options: Array<OptDefinition> = [];
  public readonly paths: Array<Array<string>> = [];

  private context?: Context;

  constructor(cliIndex: number, cliOpts: CliOptions) {
    this.cliIndex = cliIndex;
    this.cliOpts = cliOpts;
  }

  addPath(path: Array<string>) {
    this.paths.push(path);
  }

  setArity({leading = this.arity.leading, trailing = this.arity.trailing, extra = this.arity.extra, proxy = this.arity.proxy}: Partial<ArityDefinition>) {
    Object.assign(this.arity, {leading, trailing, extra, proxy});
  }

  addPositional({name = `arg`, required = true, completion}: {name?: string, required?: boolean, completion?: CompletionFunction} = {}) {
    if (!required && this.arity.extra === NoLimits)
      throw new Error(`Optional parameters cannot be declared when using .rest() or .proxy()`);
    if (!required && this.arity.trailing.length > 0)
      throw new Error(`Optional parameters cannot be declared after the required trailing positional arguments`);

    if (!required && this.arity.extra !== NoLimits) {
      this.arity.extra.push({name, completion});
    } else if (this.arity.extra !== NoLimits && this.arity.extra.length === 0) {
      this.arity.leading.push({name, completion});
    } else {
      this.arity.trailing.push({name, completion});
    }
  }

  addRest({name = `arg`, required = 0, completion}: {name?: string, required?: number, completion?: CompletionFunction} = {}) {
    if (this.arity.extra === NoLimits)
      throw new Error(`Infinite lists cannot be declared multiple times in the same command`);
    if (this.arity.trailing.length > 0)
      throw new Error(`Infinite lists cannot be declared after the required trailing positional arguments`);

    for (let t = 0; t < required; ++t)
      this.addPositional({name, completion});

    this.arity.extra = NoLimits;
    this.arity.extraCompletion = completion;
  }

  addProxy({required = 0, completion}: {name?: string, required?: number, completion?: CompletionFunction} = {}) {
    this.addRest({required, completion});
    this.arity.proxy = true;
  }

  addOption({names, description, arity = 0, hidden = false, required = false, allowBinding = true, completion}: Partial<OptDefinition> & {names: Array<string>}) {
    if (!allowBinding && arity > 1)
      throw new Error(`The arity cannot be higher than 1 when the option only supports the --arg=value syntax`);
    if (!Number.isInteger(arity))
      throw new Error(`The arity must be an integer, got ${arity}`);
    if (arity < 0)
      throw new Error(`The arity must be positive, got ${arity}`);

    this.allOptionNames.push(...names);

    const longNames = [];
    const shortNames = [];
    for (const name of names) {
      if (name.match(LONG_OPTION_REGEX)) {
        longNames.push(name);
      } else if (name.match(SHORT_OPTION_REGEX)) {
        shortNames.push(name);
      } else {
        throw new Error(`Invalid option name "${name}"`);
      }
    }

    this.options.push({names, longNames, shortNames, description, arity, hidden, required, allowBinding, completion});
  }

  setContext(context: Context) {
    this.context = context;
  }

  usage({detailed = true, inlineOptions = true}: {detailed?: boolean; inlineOptions?: boolean} = {}) {
    const segments = [this.cliOpts.binaryName];

    const detailedOptionList: Array<{
      definition: string;
      description: string;
      required: boolean;
    }> = [];

    if (this.paths.length > 0)
      segments.push(...this.paths[0]);

    if (detailed) {
      for (const {names, arity, hidden, description, required} of this.options) {
        if (hidden)
          continue;

        const args = [];
        for (let t = 0; t < arity; ++t)
          args.push(` #${t}`);

        const definition = `${names.join(`,`)}${args.join(``)}`;

        if (!inlineOptions && description) {
          detailedOptionList.push({definition, description, required});
        } else {
          segments.push(required ? `<${definition}>` : `[${definition}]`);
        }
      }

      segments.push(...this.arity.leading.map(({name}) => `<${name}>`));

      if (this.arity.extra === NoLimits)
        segments.push(`...`);
      else
        segments.push(...this.arity.extra.map(({name}) => `[${name}]`));

      segments.push(...this.arity.trailing.map(({name}) => `<${name}>`));
    }

    const usage = segments.join(` `);

    return {usage, options: detailedOptionList};
  }

  compile() {
    if (typeof this.context === `undefined`)
      throw new Error(`Assertion failed: No context attached`);

    const machine = makeStateMachine();
    let firstNode = NODE_INITIAL;

    const candidateUsage = this.usage().usage;
    const requiredOptions = this.options
      .filter(opt => opt.required)
      .map(opt => opt.names);

    firstNode = injectNode(machine, makeNode());
    registerStatic(machine, NODE_INITIAL, START_OF_INPUT, firstNode, [`setCandidateState`, {candidateUsage, requiredOptions}]);

    const positionalArgument = this.arity.proxy
      ? `always`
      : `isNotOptionLike`;

    const paths = this.paths.length > 0
      ? this.paths
      : [[]];

    for (const path of paths) {
      let lastPathNode = firstNode;

      // We allow options to be specified before the path. Note that we
      // only do this when there is a path, otherwise there would be
      // some redundancy with the options attached later.
      if (path.length > 0) {
        const optionPathNode = injectNode(machine, makeNode());
        registerShortcut(machine, lastPathNode, optionPathNode);
        this.registerOptions(machine, optionPathNode);
        lastPathNode = optionPathNode;
      }

      for (let t = 0; t < path.length; ++t) {
        const nextPathNode = injectNode(machine, makeNode());

        // TODO: find a way to not leak command into the core
        registerDynamic(machine, lastPathNode, `isCompletion`, NODE_SUCCESS, [`setCompletion`, CompletionType.PathSegment, (request, command) => {
          if (t === path.length - 1 && typeof command.constructor.usage?.description !== `undefined`) {
            return {
              completionText: path[t],
              description: command.constructor.usage.description,
            };
          }

          return path[t];
        }, this.cliIndex]);

        registerStatic(machine, lastPathNode, path[t], nextPathNode, `pushPath`);
        lastPathNode = nextPathNode;
      }

      if (this.arity.leading.length > 0 || !this.arity.proxy) {
        const helpNode = injectNode(machine, makeNode());
        registerDynamic(machine, lastPathNode, `isHelp`, helpNode, [`useHelp`, this.cliIndex]);
        registerStatic(machine, helpNode, END_OF_INPUT, NODE_SUCCESS, [`setSelectedIndex`, HELP_COMMAND_INDEX]);

        this.registerOptions(machine, lastPathNode);
      }

      if (this.arity.leading.length > 0)
        registerStatic(machine, lastPathNode, END_OF_INPUT, NODE_ERRORED, [`setError`, `Not enough positional arguments`]);

      let lastLeadingNode = lastPathNode;
      for (let t = 0; t < this.arity.leading.length; ++t) {
        const nextLeadingNode = injectNode(machine, makeNode());

        if (!this.arity.proxy)
          this.registerOptions(machine, nextLeadingNode);

        if (this.arity.trailing.length > 0 || t + 1 !== this.arity.leading.length)
          registerStatic(machine, nextLeadingNode, END_OF_INPUT, NODE_ERRORED, [`setError`, `Not enough positional arguments`]);

        const {completion} = this.arity.leading[t];
        registerDynamic(machine, lastLeadingNode, `isNotOptionLike`, nextLeadingNode, [`chain`, [
          ...completion ? [[`setCompletion`, CompletionType.Positional, completion, this.cliIndex]] : [],
          `pushPositional`,
        ]]);

        lastLeadingNode = nextLeadingNode;
      }

      let lastExtraNode = lastLeadingNode;
      if (this.arity.extra === NoLimits || this.arity.extra.length > 0) {
        const extraShortcutNode = injectNode(machine, makeNode());
        registerShortcut(machine, lastLeadingNode, extraShortcutNode);

        if (this.arity.extra === NoLimits) {
          const extraNode = injectNode(machine, makeNode());

          if (!this.arity.proxy)
            this.registerOptions(machine, extraNode);

          registerDynamic(machine, lastLeadingNode, positionalArgument, extraNode, [`chain`, [
            ...this.arity.extraCompletion ? [[`setCompletion`, CompletionType.Positional, this.arity.extraCompletion, this.cliIndex]] : [],
            `pushExtraNoLimits`,
          ]]);
          registerDynamic(machine, extraNode, positionalArgument, extraNode, [`chain`, [
            ...this.arity.extraCompletion ? [[`setCompletion`, CompletionType.Positional, this.arity.extraCompletion, this.cliIndex]] : [],
            `pushExtraNoLimits`,
          ]]);

          registerShortcut(machine, extraNode, extraShortcutNode);
        } else {
          for (let t = 0; t < this.arity.extra.length; ++t) {
            const nextExtraNode = injectNode(machine, makeNode());

            if (!this.arity.proxy)
              this.registerOptions(machine, nextExtraNode);

            const {completion} = this.arity.extra[t];

            registerDynamic(machine, lastExtraNode, positionalArgument, nextExtraNode, [`chain`, [
              ...completion ? [[`setCompletion`, CompletionType.Positional, completion, this.cliIndex]] : [],
              `pushExtra`,
            ]]);

            registerShortcut(machine, nextExtraNode, extraShortcutNode);
            lastExtraNode = nextExtraNode;
          }
        }

        lastExtraNode = extraShortcutNode;
      }

      if (this.arity.trailing.length > 0)
        registerStatic(machine, lastExtraNode, END_OF_INPUT, NODE_ERRORED, [`setError`, `Not enough positional arguments`]);

      let lastTrailingNode = lastExtraNode;
      for (let t = 0; t < this.arity.trailing.length; ++t) {
        const nextTrailingNode = injectNode(machine, makeNode());

        if (!this.arity.proxy)
          this.registerOptions(machine, nextTrailingNode);

        if (t + 1 < this.arity.trailing.length)
          registerStatic(machine, nextTrailingNode, END_OF_INPUT, NODE_ERRORED, [`setError`, `Not enough positional arguments`]);

        const {completion} = this.arity.trailing[t];
        registerDynamic(machine, lastTrailingNode, `isNotOptionLike`, nextTrailingNode, [`chain`, [
          ...completion ? [[`setCompletion`, CompletionType.Positional, completion, this.cliIndex]] : [],
          `pushPositional`,
        ]]);

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

  getOptionNameCompletionResults({onlyBatch = false, onlyBound = false, negated = false}: {onlyBatch?: boolean, onlyBound?: boolean, negated?: boolean} = {}): Array<RichCompletionResult> {
    const completions: Array<RichCompletionResult> = [];

    for (const option of this.options) {
      if (onlyBatch && (option.arity !== 0 || option.shortNames.length === 0))
        continue;

      if (onlyBound && !option.allowBinding)
        continue;

      completions.push({
        // Complete the most descriptive name
        completionText: (!onlyBatch && option.longNames[0]) || option.shortNames[0],
        listItemText: option.names.join(`,`),
        description: option.description,
      });

      if (negated && !onlyBatch && option.arity === 0 && option.longNames.length > 0) {
        const name = option.longNames.find(name => !name.startsWith(`--no-`));
        if (typeof name !== `undefined`) {
          completions.push({
            completionText: `--no-${name.slice(2)}`,
            listItemText: option.longNames.filter(name => !name.startsWith(`--no-`)).map(name => `--no-${name.slice(2)}`).join(`,`),
            description: option.description,
          });
        }
      }
    }

    // Allows binding, can't be negated or batched
    if (!onlyBatch) {
      completions.push({
        completionText: `--help`,
        listItemText: `-h,--help`,
        description: `Display the usage of the command`,
      });
    }

    return completions;
  }

  private registerOptions(machine: StateMachine, node: number) {
    registerDynamic(machine, node, [`isOption`, `--`], node, `inhibateOptions`);
    registerDynamic(machine, node, [`isBatchOption`, this.allOptionNames], node, [`chain`, [
      [`setBatchCompletion`, this],
      `pushBatch`,
    ]]);
    registerDynamic(machine, node, [`isBoundOption`, this.allOptionNames, this.options], node, [`chain`, [
      [`setBoundCompletion`, this],
      `pushBound`,
    ]]);

    registerDynamic(machine, node, [`isUnsupportedOption`, this.allOptionNames], NODE_ERRORED, [`setError`, `Unsupported option name`]);
    registerDynamic(machine, node, [`all`, [
      [`isCompletion`],
      [`isUnsupportedOption`, this.allOptionNames],
    ]], node, [`setCompletion`, CompletionType.OptionName, ({prefix}) => this.getOptionNameCompletionResults({negated: prefix.startsWith(`--no-`)}), this.cliIndex]);

    registerDynamic(machine, node, [`isUnsupportedBatchOption`, this.allOptionNames], NODE_ERRORED, [`setUnsupportedBatchOptionError`, this.allOptionNames]);
    // Nothing to complete in the case of unsupported batch options

    registerDynamic(machine, node, [`isUnsupportedBoundOption`, this.allOptionNames, this.options], NODE_ERRORED, [`setUnsupportedBoundOptionError`, this.options]);
    registerDynamic(machine, node, [`all`, [
      [`isCompletion`],
      [`isUnsupportedBoundOption`, this.allOptionNames, this.options],
    ]], node, [`setBoundCompletion`, this]);

    registerDynamic(machine, node, [`isInvalidOption`], NODE_ERRORED, [`setError`, `Invalid option name`]);
    registerDynamic(machine, node, [`all`, [
      [`isCompletion`],
      [`isInvalidOption`],
    ]], node, [`setCompletion`, CompletionType.OptionName, ({prefix}) => this.getOptionNameCompletionResults({negated: prefix.startsWith(`--no-`)}), this.cliIndex]);

    for (const option of this.options) {
      const longestName = option.names.reduce((longestName, name) => {
        return name.length > longestName.length ? name : longestName;
      }, ``);

      if (option.arity === 0) {
        for (const name of option.names) {
          registerDynamic(machine, node, [`isLongOption`, name, option.hidden || name !== longestName], node, [`chain`, [
            [`setCompletion`, CompletionType.OptionName, ({prefix}: CompletionRequest) => this.getOptionNameCompletionResults({negated: prefix.startsWith(`--no-`)}), this.cliIndex],
            `pushTrue`,
          ]]);
          registerDynamic(machine, node, [`isShortOption`, name, option.hidden || name !== longestName], node, [`chain`, [
            [`setBatchCompletion`, this],
            `pushTrue`,
          ]]);

          if (name.startsWith(`--`) && !name.startsWith(`--no-`)) {
            registerDynamic(machine, node, [`isNegatedOption`, name], node, [`pushFalse`, name]);
          }
        }
      } else {
        // We inject a new node at the end of the state machine
        let lastNode = injectNode(machine, makeNode());

        // We register transitions from the starting node to this new node
        for (const name of option.names) {
          registerDynamic(machine, node, [`isOption`, name, option.hidden || name !== longestName], lastNode, [`chain`, [
            [`setCompletion`, CompletionType.OptionName, ({prefix}: CompletionRequest) => this.getOptionNameCompletionResults({negated: prefix.startsWith(`--no-`)}), this.cliIndex],
            `pushUndefined`,
          ]]);
        }

        // For each argument, we inject a new node at the end and we
        // register a transition from the current node to this new node
        for (let t = 0; t < option.arity; ++t) {
          const nextNode = injectNode(machine, makeNode());

          // We can provide better errors when another option or END_OF_INPUT is encountered
          registerStatic(machine, lastNode, END_OF_INPUT, NODE_ERRORED, `setOptionArityError`);
          registerDynamic(machine, lastNode, `isOptionLike`, NODE_ERRORED, `setOptionArityError`);

          // If the option has a single argument, no need to store it in an array
          const action: keyof typeof reducers = option.arity === 1
            ? `setStringValue`
            : `pushStringValue`;

          const {completion} = option;
          registerDynamic(machine, lastNode, `isNotOptionLike`, nextNode, [`chain`, [
            ...completion ? [[`setCompletion`, CompletionType.OptionValue, Array.isArray(completion) ? completion[t] : completion, this.cliIndex]] : [],
            action,
          ]]);

          lastNode = nextNode;
        }

        // In the end, we register a shortcut from
        // the last node back to the starting node
        registerShortcut(machine, lastNode, node);
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
  private readonly builders: Array<CommandBuilder<Context>> = [];

  static build<Context>(cbs: Array<CliBuilderCallback<Context>>, opts: Partial<CliOptions> = {}) {
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

  commands(cbs: Array<CliBuilderCallback<Context>>) {
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

    return {
      machine,
      contexts,

      process: (input: Array<string>) => {
        return runMachine(machine, input);
      },
      complete: (request: PartialCompletionRequest) => {
        return completeMachine(machine, request);
      },
    };
  }
}
