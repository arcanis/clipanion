import { expect }           from 'chai';

import { concierge, flags } from './';

concierge
    .topLevel(``);

concierge
    .command(`command-a [... rest] [-F,--no-foo] [-X,--without-foobar] [-b,--bar] [-a,--arg ARG]`)
    .alias(`a`)
    .action(env => [ `command-a`, env ]);

concierge
    .command(`command-b [... args]`)
    .alias(`b`)
    .flag(flags.DEFAULT_COMMAND)
    .action(env => [ `command-b`, env ]);

concierge
    .command(`b foobar`)
    .action(env => [ `foobar`, env ]);;

describe(`concierge`, () => {

    it(`should select the default command when using no arguments`, () => {

        let [ command, env ] = concierge.run(null, []);

        expect(command).to.equal(`command-b`);
        expect(env.args).to.deep.equal([]);

    });

    it(`should select the default command when using extra arguments`, () => {

        let [ command, env ] = concierge.run(null, [ `hello`, `world` ]);

        expect(command).to.equal(`command-b`);
        expect(env.args).to.deep.equal([ `hello`, `world` ]);

    });

    it(`should not select the default command if another one seems to be a better match`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a` ]);

        expect(command).to.equal(`command-a`);

    });

    it(`should assign "false" as initial value for regular options`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a` ]);

        expect(env.bar).to.equal(false);

    });

    it(`should assign "true" when using a regular option long name`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `--bar` ]);

        expect(env.bar).to.equal(true);

    });

    it(`should assign "true" when using a regular option short name`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `-b` ]);

        expect(env.bar).to.equal(true);

    });

    it(`should assign "true" as initial value for --no- options`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a` ]);

        expect(env.foo).to.equal(true);
        expect(env.withFoobar).to.equal(true);

    });

    it(`should assign "false" when using a --no- option long name`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `--no-foo`, `--without-foobar` ]);

        expect(env.foo).to.equal(false);
        expect(env.withFoobar).to.equal(false);

    });

    it(`should assign "false" when using a --no- option short name`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `-F`, `-X` ]);

        expect(env.foo).to.equal(false);
        expect(env.withFoobar).to.equal(false);

    });

    it(`should assign "undefined" as initial value for options expecting an argument`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a` ]);

        expect(env.arg).to.equal(undefined);

    });

    it(`should assign "null" as value for options expecting an argument, when using the --no- option`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `--no-arg` ]);

        expect(env.arg).to.equal(null);

    });

    it(`should not parse the following argument when using the --no- option`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `--no-arg`, `hello` ]);

        expect(env.arg).to.equal(null);
        expect(env.rest).to.deep.equal([ `hello` ]);

    });

    it(`should assign a string when using an argument-aware option long name`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `--arg`, `.js` ]);

        expect(env.arg).to.equal(`.js`);

    });

    it(`should assign a string when using an argument-aware option short name (external argument)`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `-a`, `.js` ]);

        expect(env.arg).to.equal(`.js`);

    });

    it(`should assign a string when using an argument-aware option short name (inline argument)`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `-a.js` ]);

        expect(env.arg).to.equal(`.js`);

    });

    it(`should correctly resolve aliased commands`, () => {

        let [ command, env ] = concierge.run(null, [ `a` ]);

        expect(command).to.equal(`command-a`);

    });

    it(`should correctly forward any argument to the aliased command`, () => {

        let [ command, env ] = concierge.run(null, [ `a`, `-a`, `.js` ]);

        expect(command).to.equal(`command-a`);
        expect(env.arg).to.equal(`.js`);

    });

    it(`should use nested commands before any alias if possible`, () => {

        let [ command, env ] = concierge.run(null, [ `b`, `foobar` ]);

        expect(command).to.equal(`foobar`);

    });

});
