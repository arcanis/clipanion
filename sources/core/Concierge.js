import chalk          from 'chalk';
import fs             from 'fs';
import Joi            from 'joi';
import path           from 'path';

import { Command }    from './Command';
import { UsageError } from './UsageError';
import * as flags     from './flags';
import { parse }      from './parse';
import * as index     from './';

let standardOptions = [ {

    shortName: `h`,
    longName: `help`,

    argumentName: null,

} ];

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

        if (option.longName)
            names.push(`--${option.longName}`);

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

        this.validators = {};
        this.options = standardOptions;

    }

    topLevel(pattern) {

        let definition = parse(pattern);

        if (definition.path.length > 0)
            throw new Error(`The top-level pattern cannot have a command path; use command() instead`);

        if (definition.requiredArguments.length > 0)
            throw new Error(`The top-level pattern cannot have required arguments; use command() instead`);

        if (definition.optionalArguments.length > 0)
            throw new Error(`The top-level pattern cannot have optional arguments; use command() instead`);

        this.options = standardOptions.concat(definition.options);

        return this;

    }

    validate(optionName, validator) {

        this.validators[optionName] = validator(Joi);

        return this;

    }

    directory(startingPath, { extension = `.js`, recursive = true } = {}) {

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

                if (stat.isFile() && entry.endsWith(extension)) {
                    commandFiles.push(entryPath);
                }

            }

        }

        for (let commandPath of commandFiles) {

            let pkg = require(commandPath);
            let factory = pkg.default || pkg;

            factory(index);

        }

    }

    command(pattern) {

        let definition = parse(pattern);

        if (definition.path.length === 0)
            throw new Error(`A command pattern cannot have an empty command path; use options() instead`);

        let command = new Command(definition);
        this.commands.push(command);

        return command;

    }

    usage(name, { command = null, error = null } = {}) {

        if (error) {
            console.log(`${chalk.red.bold(`Error`)}${chalk.bold(`:`)} ${error.message}`);
            console.log();
        }

        if (command) {

            let execPath = name ? [].concat(name).join(` `) : `???`;

            let commandPath = command.path.join(` `);

            let requiredArguments = command.requiredArguments.map(name => `<${name}>`).join(` `);
            let optionalArguments = command.optionalArguments.map(name => `[${name}]`).join(` `);

            let globalOptions = getOptionString(this.options);
            let commandOptions = getOptionString(command.options);

            console.log(`${chalk.bold(`Usage:`)} ${execPath} ${globalOptions} ${commandPath} ${requiredArguments} ${optionalArguments} ${commandOptions}`.replace(/ +/g, ` `).trim());

            if (!error && command.description) {
                console.log();
                console.log(command.description);
            }

        } else {

            let execPath = name ? [].concat(name).join(` `) : `???`;

            let globalOptions = getOptionString(this.options);

            console.log(`${chalk.bold(`Usage:`)} ${execPath} ${globalOptions} <command>`.replace(/ +/g, ` `).trim());

            if (this.commands) {

                console.log();
                console.log(`${chalk.bold(`Where <command> is one of:`)}`);
                console.log();

                let maxPathLength = Math.max(0, ... this.commands.map(command => {
                    return command.path.join(` `).length;
                }));

                let pad = str => {
                    return `${str}${` `.repeat(maxPathLength - str.length)}`;
                };

                for (let command of this.commands) {
                    console.log(`  ${chalk.bold(pad(command.path.join(` `)))}  ${command.description}`);
                }

            }

        }

    }

    check() {

        if (this.commands.filter(command => command.flags & flags.DEFAULT_COMMAND).length > 1)
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

    run(argv0, argv) {

        this.check();

        let env = {};
        let rest = [];

        let selectedCommand = this.commands.find(command => command.flags & flags.DEFAULT_COMMAND);
        let candidateCommands = this.commands;

        let commandPath = [];
        let commandBuffer = [];
        let isCommandLocked = false;

        let LONG_OPTION = 0;
        let SHORT_OPTION = 1;
        let STOP_OPTION = 2;
        let MALFORMED_OPTION = 3;
        let RAW_STRING = 4;

        let LONG_OPTION_REGEXP = /^--(?:(no|without)-)?([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)(?:(=)(.*))?$/;
        let SHORT_OPTION_REGEXP = /^-([a-z])(?:=(.*))?(.*)$/;

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

                            if (leadingOption.longName) {
                                env[leadingOption.longName] = value;
                            } else {
                                env[leadingOption.shortName] = value;
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

                                if (option.longName) {
                                    env[option.longName] = true;
                                } else {
                                    env[option.shortName] = true;
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

                            let disablePrefix = option.longName.startsWith(`--with-`) ? `--without` : `--no`;

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

                        if (option.longName) {
                            env[option.longName] = value;
                        } else {
                            env[option.shortName] = value;
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

                            candidateCommands = nextCandidates;

                            if (candidateCommands.length === 1) {
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

                env[name] = rest.shift();

            }

            for (let name of selectedCommand.optionalArguments) {

                if (rest.length === 0)
                    break;

                env[name] = rest.shift();

            }

            if (selectedCommand.spread)
                env[selectedCommand.spread] = rest;
            else if (rest.length > 0)
                throw new UsageError(`Too many arguments`);

            let validationResults = Joi.validate(env, Joi.object().keys(Object.assign({}, this.validators, selectedCommand.validators)).unknown());

            if (validationResults.error) {

                if (validationResults.error.details.length > 1) {
                    throw new UsageError(`Validation failed because ${validationResults.error.details.slice(0, -1).map(detail => detail.message).join(`, `)}, and ${validationResults.error.details[validationResults.error.details.length - 1].message}`);
                } else {
                    throw new UsageError(`Validation failed because ${validationResults.error.details[0].message}`);
                }

            }

            env = validationResults.value;

            if (env.help) {

                if (commandPath.length > 0) {
                    this.usage(argv0, { command: selectedCommand });
                } else {
                    this.usage(argv0);
                }

            } else {
                selectedCommand.run(env);
            }

        } catch (error) {

            if (error instanceof UsageError) {
                this.usage(argv0, { command: selectedCommand, error });
            } else {
                throw error;
            }

        }

    }

}
