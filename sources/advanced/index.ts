import {Command} from './Command'
import {HelpCommand} from "./entries/help";
import {VersionCommand} from "./entries/version";

Command.Entries.Help = HelpCommand
Command.Entries.Version = VersionCommand

export {Command}

export {BaseContext, Cli, CliOptions} from './Cli';
export {CommandClass, Usage, Definition} from './Command';

export {UsageError} from '../errors';
