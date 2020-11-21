import {Command} from '../Command';

export class DefinitionsCommand extends Command<any> {
    static path = `--clipanion=definitions`;
    async execute() {
        this.context.stdout.write(`${JSON.stringify(this.cli.definitions(), null, 2)}\n`);
    }
}
