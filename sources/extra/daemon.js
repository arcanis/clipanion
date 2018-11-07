import cp            from 'child_process';
import http          from 'http';
import stream        from 'stream';

import { concierge } from '../core';

const DeferToDaemon = {};

function wrapFunction(object, name, replacement) {

    let original = object[name];

    object[name] = function (... args) {
        return replacement.call(this, original.bind(this), ... args);
    };

}

export function makeDaemon(concierge, { port } = {}) {

    const category = `Daemon commands (port ${port})`;

    concierge.topLevel(`[--no-daemon]`);

    concierge.command(`start [... init-args]`).categorize(category).describe(`start a standalone daemon`).action(({ argv0, stdin, stdout, stderr, initArgs }) => {

        return new Promise((resolve, reject) => {

            let resolveInit, rejectInit;

            let init = new Promise((resolve, reject) => {
                resolveInit = resolve;
                rejectInit = reject;
            });

            init.catch(error => {
                reject(error);
            });

            let server = http.createServer((request, response) => {

                if (request.url !== `/concierge/command`) {

                    response.writeHead(404);
                    response.end();

                } else {

                    let argv0 = JSON.parse(request.headers[`x-concierge-argv0`]);
                    let argv = JSON.parse(request.headers[`x-concierge-argv`]);

                    stdout.write(`Received ${JSON.stringify(argv)}\n`);

                    response.writeHead(200);

                    init.then(() => {

                        let locks = 2;
                        let releaseLock = () => --locks === 0 ? request.end() : undefined;

                        let stdin = new stream.PassThrough();

                        let stdout = new stream.PassThrough();
                        let stderr = new stream.PassThrough();

                        request.pipe(stdin);

                        stdout.pipe(response, { end: false });
                        stderr.pipe(response, { end: false });

                        stdout.on(`end`, releaseLock);
                        stderr.on(`end`, releaseLock);

                        return concierge.run(argv0, [ `--no-daemon`, ... argv ], { stdin, stdout, stderr });

                    }).then(() => {

                        response.end();

                    }, error => {

                        response.write(error.stack);
                        response.end();

                    });

                }

            });

            server.on(`error`, error => {

                reject(error);

            });

            server.listen(port, error => {

                if (error) {

                    reject(error);

                } else {

                    Promise.resolve().then(() => {
                        return concierge.run(argv0, [ `_init`, `--no-daemon`, ... initArgs ], { stdin, stdout, stderr });
                    }).then(resolveInit, rejectInit).then(() => {
                        stdout.write(`The daemon is now listening on port ${port}...\n`);
                    });

                }

            });

        });

    });

    concierge.command(`status`).categorize(category).describe(`check the daemon status`).action(({ stdout }) => new Promise((resolve, reject) => {

        let request = http.request({

            host: `127.0.0.1`,
            port: port,

            path: `/concierge/daemon/status`,
            method: `GET`

        }, response => {

            let buffers = [];

            response.on(`data`, buffer => {
                buffers.push(buffer);
            });

            response.on(`end`, () => {
                stdout.write(`Daemon is up\n`);
                resolve(0);
            });

        });

        request.on(`error`, error => {

            if (error.code !== `ECONNREFUSED`)
                return reject(error);

            stdout.write(`Daemon is down\n`);
            resolve(1);

        });

        request.end();

    }));

    wrapFunction(concierge, `command`, function (commandFn, pattern) {

        let command = commandFn(pattern);

        wrapFunction(command, `action`, function (actionFn, action) {

            return actionFn(env => {

                if (!env.daemon) {
                    return action(env);
                } else {
                    return DeferToDaemon;
                }

            });

        });

        return command;

    });

    wrapFunction(concierge, `run`, function (runFn, argv0, argv, initialEnv) {

        let result = runFn(argv0, argv, initialEnv);

        if (result === DeferToDaemon) {

            return new Promise((resolve, reject) => {

                let body = JSON.stringify({

                    argv0,
                    argv

                });

                let onStdinData = (buffer) => {
                    request.write(buffer);
                };

                let onStdinEnd = () => {
                    request.end();
                };

                let request = http.request({

                    host: `127.0.0.1`,
                    port: port,

                    path: `/concierge/command`,
                    method: `POST`,

                    headers: {

                        [`Content-Type`]: `application/x-www-form-urlencoded`,
                        [`Content-Length`]: Buffer.byteLength(body),

                        [`X-Concierge-Argv0`]: JSON.stringify(argv0),
                        [`X-Concierge-Argv`]: JSON.stringify(argv)

                    }

                }, response => {

                    response.setEncoding(`utf8`);

                    response.on(`error`, error => {
                        reject(error);
                    });

                    response.on(`data`, data => {
                        process.stdout.write(data);
                    });

                    response.on(`end`, () => {

                        process.stdin.removeListener(`data`, onStdinData);
                        process.stdin.removeListener(`end`, onStdinEnd);

                        process.stdin.unref();

                        request.end();

                        resolve();

                    });

                });

                request.flushHeaders();

                process.stdin.on(`data`, onStdinData);
                process.stdin.on(`end`, onStdinEnd);

            });

        } else {

            return result;

        }

    });

    return concierge;

}
