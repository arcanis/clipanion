import {Command} from './Command';
import {Machine} from './Machine';

export class Cli<T> {
    private commands: Command<T>[] = [];

    register(command: Command<T>) {
        this.commands.push(command);

        return this;
    }

    start() {
        const proxyByPaths = new Map();

        // We must register the location where proxies start so that we can
        // inject the `-h,--help` option at the right location
        for (const command of this.commands) {
            if (command.definition.positionals.proxy) {
                const pathHash = command.definition.path.join(`\0`);
                const proxyStart = command.definition.path.length + command.definition.positionals.minimum;

                proxyByPaths.set(pathHash, Math.min(proxyStart, proxyByPaths.get(pathHash) || Infinity));
            }
        }

        for (const command of this.commands) {
            const pathHash = command.definition.path.join(`\0`);
            const proxyStart = proxyByPaths.get(pathHash);

            command.compile({proxyStart});
        }

        return new Machine<T>(this.commands);
    }

    process(argv: string[]): T {
        const machine = this.start();

        for (const arg of argv)
            machine.write(arg);

        return machine.digest();
    }
}
