import { concierge }  from '../sources/core';
import { makeDaemon } from '../sources/extra/daemon';

let daemon = makeDaemon(concierge, {
    port: 9242
});

daemon.command(`init`)
    .action(({ stdout }) => { stdout.write(`init completed\n`) });

daemon.command(`test`)
    .action(({ stdout }) => { stdout.write(`foo\n`) });

daemon
    .run(process.argv0, process.argv.slice(2));
