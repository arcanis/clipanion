import chalk            from 'chalk';
import fs               from 'fs';
import { camelCase }    from 'lodash';
import path             from 'path';

import { Command }      from './Command';
import { UsageError }   from './UsageError';
import { parse }        from './parse';

let standardOptions = [ {

    shortName: `h`,
    longName: `help`,

    argumentName: null,

}, {

    shortName: `c`,
    longName: `config`,

    argumentName: `NAME`

} ];

function runMaybePromises(callbacks, returnIndex) {

    let results = new Array(callbacks.length);
    let promise = null;

    for (let t = 0; t < callbacks.length; ++t) {

        let callback = callbacks[t];

        if (promise) {

            promise = promise.then(() => {
                return Promise.resolve(callback()).then(result => {
                    results[t] = result;
                });
            });

        } else {

            let result = results[t] = callback();

            if (result && result.then) {
                promise = result.then(trueResult => {
                    results[t] = trueResult;
                });
            }

        }

    }

    if (promise) {

        return promise.then(() => {
            return results[returnIndex];
        });

    } else {

        return results[returnIndex];

    }

}

function getOptionString(options) {

    let basicOptions = [];
    let complexOptions = [];

    for (let option of options) {

        if (option.shortName && !option.longName && !option.argumentName) {
            basicOptions.push(option);
        } else {
            complexOptions.push(option);
        }

    }

    let basicString = basicOptions.length > 0 ? `[-${basicOptions.map(option => {

        return option.shortName;

    }).join(``)}]` : null;

    let complexString = complexOptions.map(option => {

        let names = [];

        if (option.shortName)
            names.push(`-${option.shortName}`);

        if (option.longName) {
            if (option.initialValue !== true) {
                names.push(`--${option.longName}`);
            } else if (option.longName.startsWith(`with-`)) {
                names.push(`--without-${option.longName.replace(/^with-/, ``)}`);
            } else {
                names.push(`--no-${option.longName}`);
            }
        }

        if (option.argumentName) {
            return `[${names.join(`,`)} ${option.argumentName}]`;
        } else {
            return `[${names.join(`,`)}]`;
        }

    }).join(` `);

    return [

        basicString,
        complexString

    ].join(` `);

}

export class Concierge {

    constructor() {

        this.commands = [];

        this.validator = null;
        this.options = standardOptions;

        this.beforeEachList = [];
        this.afterEachList = [];

    }

    beforeEach(callback) {

        this.beforeEachList.push(callback);

        return this;

    }

    afterEach(callback) {

        this.afterEachList.push(callback);

        return this;

    }

    topLevel(pattern) {

        if (Array.isArray(pattern))
            pattern = pattern.join(` `);

        let definition = parse(pattern);

        if (definition.path.length > 0)
            throw new Error(`The top-level pattern cannot have a command path; use command() instead`);

        if (definition.requiredArguments.length > 0)
            throw new Error(`The top-level pattern cannot have required arguments; use command() instead`);

        if (definition.optionalArguments.length > 0)
            throw new Error(`The top-level pattern cannot have optional arguments; use command() instead`);

        this.options = this.options.concat(definition.options);

        return this;

    }

    validate(validator) {

        this.validator = validator;

        return this;

    }

    directory(startingPath, recursive = true, pattern = /\.js$/) {

        if (typeof IS_WEBPACK !== `undefined`) {

            if (typeof startingPath === `string`)
                throw new Error(`In webpack mode, you must use require.context to provide the directory content yourself; a path isn't enough`);

            for (let entry of startingPath.keys()) {

                let pkg = startingPath(entry);
                let factory = pkg.default || pkg;

                factory(this);

            }

        } else {

            let pathQueue = [ path.resolve(startingPath) ];
            let commandFiles = [];

            while (pathQueue.length > 0) {

                let currentPath = pathQueue.shift();
                let entries = fs.readdirSync(currentPath);

                for (let entry of entries) {

                    let entryPath = `${currentPath}/${entry}`;
                    let stat = fs.lstatSync(entryPath);

                    if (stat.isDirectory() && recursive)
                        pathQueue.push(entryPath);

                    if (stat.isFile() && entry.match(pattern)) {
                        commandFiles.push(entryPath);
                    }

                }

            }

            for (let commandPath of commandFiles) {

                let pkg = require(commandPath);
                let factory = pkg.default || pkg;

                factory(this);

            }

        }

    }

    command(pattern) {

        if (Array.isArray(pattern))
            pattern = pattern.join(` `);

        let definition = parse(pattern);

        let command = new Command(this, definition);
        this.commands.push(command);

        return command;

    }

    error(error, { stream }) {

        if (error instanceof UsageError) {

            stream.write(`${chalk.red.bold(`Error`)}${chalk.bold(`:`)} ${error.message}\n`);

        } else if (typeof error === `object` && error && error.message) {

            let stackIndex = error.stack ? error.stack.search(/\n *at /) : -1;

            if (stackIndex >= 0) {
                stream.write(`${chalk.red.bold(`Error`)}${chalk.bold(`:`)} ${error.message}${error.stack.substr(stackIndex)}\n`);
            } else {
                stream.write(`${chalk.red.bold(`Error`)}${chalk.bold(`:`)} ${error.message}\n`);
            }

        } else {

            stream.write(`${chalk.red.bold(`Error`)}${chalk.bold(`:`)} ${error}\n`);

        }

    }

    usage(argv0, { command = null, error = null, stream = process.stderr } = {}) {

        if (error) {

            this.error(error, { stream });

            stream.write(`\n`);

        }

        if (command) {

            let execPath = argv0 ? [].concat(argv0).join(` `) : `???`;

            let commandPath = command.path.join(` `);

            let requiredArguments = command.requiredArguments.map(name => `<${name}>`).join(` `);
            let optionalArguments = command.optionalArguments.map(name => `[${name}]`).join(` `);

            let globalOptions = getOptionString(this.options);
            let commandOptions = getOptionString(command.options);

            stream.write(`${chalk.bold(`Usage:`)} ${execPath} ${globalOptions} ${commandPath} ${requiredArguments} ${optionalArguments} ${commandOptions}\n`.replace(/ +/g, ` `).replace(/ +$/, ``));

            if (!error && command.description) {
                stream.write(`\n`);
                stream.write(`${command.description}\n`);
            }

        } else {

            let execPath = argv0 ? [].concat(argv0).join(` `) : `???`;

            let globalOptions = getOptionString(this.options);

            stream.write(`${chalk.bold(`Usage:`)} ${execPath} ${globalOptions} <command>\n`.replace(/ +/g, ` `).replace(/ +$/, ``));

            let commands = this.commands.filter(command => !command.hiddenCommand);

            if (commands.length > 0) {

                stream.write(`\n`);
                stream.write(`${chalk.bold(`Where <command> is one of:`)}\n`);
                stream.write(`\n`);

                let maxPathLength = Math.max(0, ... commands.map(command => {
                    return command.path.join(` `).length;
                }));

                let pad = str => {
                    return `${str}${` `.repeat(maxPathLength - str.length)}`;
                };

                for (let command of commands) {
                    stream.write(`  ${chalk.bold(pad(command.path.join(` `)))}  ${command.description || `undocumented`}\n`);
                }

            }

        }

    }

    check() {

        if (this.commands.filter(command => command.defaultCommand).length > 1)
            throw new Error(`Multiple commands have been flagged as default command`);

        let shortNames = this.options.map(option => option.shortName).filter(name => name);
        let longNames = this.options.map(option => option.longName).filter(name => name);

        let topLevelNames = [].concat(shortNames, longNames);

        if (new Set(topLevelNames).size !== topLevelNames.length)
            throw new Error(`Some top-level parameter names are conflicting together`);

        for (let command of this.commands) {
            command.check(topLevelNames);
        }

    }

    run(argv0, argv, { stdin = process.stdin, stdout = process.stdout, stderr = process.stderr, ... initialEnv } = {}) {

        // Sanity check to make sure that the configuration makes sense
        this.check();

        // This object is the one we'll fill with the parsed options
        let env = { argv0, stdin, stdout, stderr };

        // This array will contain the literals that will be forwarded to the command as positional arguments
        let rest = [];

        // We copy the global options from our initial environment into our new one (it's a form of inheritance)
        for (let option of this.options) {

            if (option.longName) {

                if (Object.prototype.hasOwnProperty.call(initialEnv, option.longName)) {
                    env[option.longName] = initialEnv[option.longName];
                }

            } else {

                if (Object.prototype.hasOwnProperty.call(initialEnv, option.shortName)) {
                    env[option.shortName] = initialEnv[option.shortName];
                }

            }

        }

        // This pointer contains the command we'll be using if nothing prevents it
        let selectedCommand = this.commands.find(command => command.defaultCommand);

        // This array is the list of the commands we might still have a chance to end up using
        let candidateCommands = this.commands;

        // This array is the list of the words that make up the selected command name
        let commandPath = [];

        // This array is the list of the words that might end up in a command name
        let commandBuffer = [];

        // True if a command has been locked (cannot be changed anymore), false otherwise
        let isCommandLocked = false;

        let LONG_OPTION = 0;
        let SHORT_OPTION = 1;
        let STOP_OPTION = 2;
        let MALFORMED_OPTION = 3;
        let RAW_STRING = 4;

        let LONG_OPTION_REGEXP = /^--(?:(no|without)-)?([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)(?:(=)(.*))?$/;
        let SHORT_OPTION_REGEXP = /^-([a-zA-Z])(?:=(.*))?(.*)$/;

        function lockCommand() {

            if (isCommandLocked)
                return;

            if (!selectedCommand)
                throw new UsageError(`No commands match the arguments you've providen`);

            // We can save what's left of our command buffer into the argv array that will be providen to the command
            rest = commandBuffer.slice(commandPath.length);

            isCommandLocked = true;

        }

        function getShortOption(short) {

            return options.find(option => {
                return option.shortName === short;
            });

        }

        function getLongOption(long) {

            return options.find(option => {
                return option.longName === long;
            });

        }

        function parseArgument(literal) {

            if (literal === `--`)
                return { type: STOP_OPTION, literal };

            if (literal.startsWith(`--`)) {

                let match = literal.match(LONG_OPTION_REGEXP);

                if (match) {
                    return { type: LONG_OPTION, literal, enabled: !match[1], name: (match[1] === `without` ? `with-` : ``) + match[2], value: match[3] ? match[4] || `` : undefined };
                } else {
                    return { type: MALFORMED_OPTION, literal };
                }

            }

            if (literal.startsWith(`-`)) {

                let match = literal.match(SHORT_OPTION_REGEXP);

                if (match) {
                    return { type: SHORT_OPTION, literal, leading: match[1], value: match[2], rest: match[3] };
                } else {
                    return { type: MALFORMED_OPTION, literal };
                }

            }

            return { type: RAW_STRING, literal };

        }

        try {

            let parsedArgv = argv.map(arg => parseArgument(arg));

            for (let t = 0, T = parsedArgv.length; t < T; ++t) {

                let current = parsedArgv[t];
                let next = parsedArgv[t + 1];

                switch (current.type) {

                    case MALFORMED_OPTION: {

                        throw new UsageError(`Malformed option "${current.literal}"`);

                    } break;

                    case STOP_OPTION: {

                        lockCommand();

                        for (t = t + 1; t < T; ++t) {
                            rest.push(parsedArgv[t].literal);
                        }

                    } break;

                    case SHORT_OPTION: {

                        let leadingOption = selectedCommand ? selectedCommand.options.find(option => option.shortName === current.leading) : null;

                        if (leadingOption)
                            lockCommand();
                        else
                            leadingOption = this.options.find(option => option.shortName === current.leading);

                        if (!leadingOption)
                            throw new UsageError(`Unknown option "${current.leading}"`);

                        if (leadingOption.argumentName) {

                            let value = current.value || current.rest || undefined;

                            if (!value && next && next.type === RAW_STRING) {
                                value = next.literal;
                                t += 1;
                            }

                            if (value === undefined)
                                throw new UsageError(`Option "${leadingOption.shortName}" cannot be used without argument`);

                            let envName = leadingOption.longName
                                ? camelCase(leadingOption.longName)
                                : leadingOption.shortName;

                            if (Array.isArray(leadingOption.initialValue)) {
                                if (env[envName]) {
                                    env[envName].push(value);
                                } else {
                                    env[envName] = [value];
                                }
                            } else {
                                env[envName] = value;
                            }

                        } else {

                            if (current.value)
                                throw new UsageError(`Option "${leadingOption.shortName}" doesn't expect any argument`);

                            if (!current.rest.match(/^[a-z0-9]*$/))
                                throw new UsageError(`Malformed option list "${current.literal}"`);

                            for (let optionName of [ current.leading, ... current.rest ]) {

                                let option = selectedCommand ? selectedCommand.options.find(option => option.shortName === optionName) : null;

                                if (option)
                                    lockCommand();
                                else
                                    option = this.options.find(option => option.shortName === optionName);

                                if (!option)
                                    throw new UsageError(`Unknown option "${optionName}"`);

                                if (option.argumentName)
                                    throw new UsageError(`Option "${optionName}" cannot be placed in an option list, because it expects an argument`);

                                if (option.maxValue !== undefined) {

                                    if (option.longName) {
                                        env[camelCase(option.longName)] = Math.min((env[camelCase(option.longName)] || option.initialValue) + 1, option.maxValue);
                                    } else {
                                        env[option.shortName] = Math.min((env[option.shortName] || option.initialValue) + 1, option.maxValue);
                                    }

                                } else {

                                    if (option.longName) {
                                        env[camelCase(option.longName)] = !option.initialValue;
                                    } else {
                                        env[option.shortName] = !option.initialValue;
                                    }

                                }

                            }

                        }

                    } break;

                    case LONG_OPTION: {

                        let option = selectedCommand ? selectedCommand.options.find(option => option.longName === current.name) : null;

                        if (option)
                            lockCommand();
                        else
                            option = this.options.find(option => option.longName === current.name);

                        if (!option)
                            throw new UsageError(`Unknown option "${current.name}"`);

                        let value;

                        if (option.argumentName) {

                            let disablePrefix = option.longName.startsWith(`with-`) ? `--without` : `--no`;

                            if (!current.enabled && current.value !== undefined)
                                throw new UsageError(`Option "${option.longName}" cannot have an argument when used with ${disablePrefix}`);

                            if (current.enabled) {

                                if (current.value !== undefined) {
                                    value = current.value;
                                } else if (next && next.type === RAW_STRING) {
                                    value = next.literal;
                                    t += 1;
                                } else {
                                    throw new UsageError(`Option "${option.longName}" cannot be used without argument. Use "${disablePrefix}-${option.longName}" instead`);
                                }

                            } else {

                                value = null;

                            }

                        } else {

                            if (current.value !== undefined)
                                throw new UsageError(`Option "${option.name}" doesn't expect any argument`);

                            if (current.enabled) {
                                value = true;
                            } else {
                                value = false;
                            }

                        }

                        let envName = option.longName
                            ? camelCase(option.longName)
                            : option.shortName;

                        if (Array.isArray(option.initialValue)) {
                            if (env[envName]) {
                                env[envName].push(value);
                            } else {
                                env[envName] = [value];
                            }
                        } else {
                            env[envName] = value;
                        }

                    } break;

                    case RAW_STRING: {

                        if (!isCommandLocked) {

                            let nextCandidates = candidateCommands.filter(command => command.path[commandBuffer.length] === current.literal);

                            commandBuffer.push(current.literal);

                            let nextSelectedCommand = nextCandidates.find(command => command.path.length === commandBuffer.length);

                            if (nextSelectedCommand) {
                                selectedCommand = nextSelectedCommand;
                                commandPath = commandBuffer;
                            }

                            candidateCommands = nextCandidates.filter(candidate => candidate !== nextSelectedCommand);

                            // If we've jumped on a proxy command, then we lock it now and here, and we forward everything else as "rest" parameter
                            if (selectedCommand && selectedCommand.proxyArguments) {

                                lockCommand();

                                for (t = t + 1; t < T; ++t) {
                                    rest.push(parsedArgv[t].literal);
                                }

                            // If there's absolutely no other command we can switch to, then we can lock the current one right away, so that we can start parsing its options
                            } else if (candidateCommands.length === 0) {

                                lockCommand();

                            }

                        } else {

                            rest.push(current.literal);

                        }

                    } break;

                }

            }

            lockCommand();

            for (let name of selectedCommand.requiredArguments) {

                if (rest.length === 0)
                    throw new UsageError(`Missing required argument "${name}"`);

                env[camelCase(name)] = rest.shift();

            }

            for (let name of selectedCommand.optionalArguments) {

                if (rest.length === 0)
                    break;

                env[camelCase(name)] = rest.shift();

            }

            if (selectedCommand.spread)
                env[camelCase(selectedCommand.spread)] = rest;

            else if (rest.length > 0)
                throw new UsageError(`Too many arguments`);

            for (let option of [ ... selectedCommand.options, ... this.options ]) {

                let envName = option.longName
                    ? camelCase(option.longName)
                    : option.shortName;

                if (Object.prototype.hasOwnProperty.call(env, envName))
                    continue;

                env[envName] = option.initialValue;

            }

            if (this.validator || selectedCommand.validator) {

                let Joi;

                try {
                    Joi = require(`joi`);
                } catch (error) {
                    // Should fool webpack into not emitting errors if the (optional) dependency cannot be found
                    throw error;
                }

                let validator = Joi.any();

                if (this.validator)
                    validator = validator.concat(this.validator);

                if (selectedCommand.validator)
                    validator = validator.concat(selectedCommand.validator);

                let validationResults = Joi.validate(env, validator);

                if (validationResults.error) {

                    if (validationResults.error.details.length > 1) {
                        throw new UsageError(`Validation failed because ${validationResults.error.details.slice(0, -1).map(detail => detail.message).join(`, `)}, and ${validationResults.error.details[validationResults.error.details.length - 1].message}`);
                    } else {
                        throw new UsageError(`Validation failed because ${validationResults.error.details[0].message}`);
                    }

                } else {

                    env = validationResults.value;

                }

            }

            if (env.help) {

                if (commandPath.length > 0)
                    this.usage(argv0, { command: selectedCommand, stream: stdout });
                else
                    this.usage(argv0, { stream: stdout });

                return 0;

            } else {

                if (env.config) {

                    let configOptions = JSON.parse(fs.readFileSync(env.config, `utf8`));

                    for (let name of Object.keys(configOptions)) {

                        let option = selectedCommand.options.find(option => option.longName === optionName);

                        if (!option)
                            option = this.options.find(option => option.longName === optionName);

                        if (!option)
                            continue;

                        if (configOptions[name] === undefined)
                            continue;

                        if (option.argumentName) {

                            if (typeof configOptions[name] === `string` || configOptions[name] === null) {
                                env[name] = configOptions[name];
                            } else {
                                throw new UsageError(`Option "${name}" must be a string, null, or undefined`);
                            }

                        } else {

                            if (option.maxValue !== undefined) {

                                if (Number.isInteger(configOptions[name])) {
                                    env[name] = Math.max(0, Math.min(Number(configOptions[name]), option.maxValue));
                                } else {
                                    throw new UsageError(`Option "${name}" must be a number or undefined`);
                                }

                            } else {

                                if (typeof configOptions[name] === `boolean`) {
                                    env[name] = configOptions[name];
                                } else {
                                    throw new UsageError(`Option "${name}" must be a boolean or undefined`);
                                }

                            }

                        }

                    }

                }

                let result = runMaybePromises([

                    ... this.beforeEachList.map(beforeEach => () => {
                        beforeEach(env);
                    }),

                    () => selectedCommand.run(env),

                    ... this.afterEachList.map(afterEach => () => {
                        afterEach(env);
                    }),

                ], this.beforeEachList.length);

                if (result && result.then) {

                    result = result.then(null, error => {

                        if (error instanceof UsageError) {

                            this.usage(argv0, { command: selectedCommand, error, stream: stderr });

                            return 1;

                        } else {

                            throw error;

                        }

                    });

                }

                return result;

            }

        } catch (error) {

            if (error instanceof UsageError) {

                this.usage(argv0, { command: selectedCommand, error, stream: stderr });

                return 1;

            } else {

                throw error;

            }

        }

        return undefined;

    }

    runExit(argv0, argv, { stdin = process.stdin, stdout = process.stdout, stderr = process.stderr, ... rest } = {}) {

        Promise.resolve(this.run(argv0, argv, { stdin, stdout, stderr, ... rest })).then(exitCode => {

            process.exitCode = exitCode;

        }, error => {

            this.error(error, { stream: stderr });

            process.exitCode = 1;

        });

    }

}
