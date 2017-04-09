let Joi = require(`joi`);
let { concierge, flags } = require(`.`);

concierge
    .topLevel(`[-lmno]`);

concierge
    .command(`update <game> [... extra] [--x]`)
    .describe(`Update the game database for a specific game`)
    .action((... args) => console.log(args));

concierge
    .command(`daemon [-p,--port PORT]`)
    .flag(flags.DEFAULT_COMMAND)
    .validate(`port`, Joi.number().min(1).max(65535))
    .describe(`Start a daemon that will execute any command request`)
    .action((... args) => console.log(args));

concierge
    .run(process.argv0, process.argv.slice(2));
