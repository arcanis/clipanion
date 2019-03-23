import { expect }           from 'chai';

import { concierge, flags } from './';

concierge
    .topLevel(``);

concierge
    .command(`command-a [... rest] [-v,-vv,-vvv,--verbose] [-F,--no-foo] [-X,--without-foobar] [-b,--bar] [--baz?] [-a,--arg ARG] [--many-args ARGS...]`)
    .aliases(`a`)
    .action(env => [ `command-a`, env ]);

concierge
    .command(`command-b [... args]`)
    .aliases(`b`)
    .flags({ defaultCommand: true })
    .action(env => [ `command-b`, env ]);

concierge
    .command([`b`, `foobar`])
    .action(env => [ `foobar`, env ]);;

concierge
    .command(`command-proxy [... rest]`)
    .flags({ proxyArguments: true })
    .action(env => [ `command-proxy`, env ]);

concierge
    .command(`command-proxy-with-arg <arg> [... rest] [-f,--foo]`)
    .flags({ proxyArguments: true })
    .action(env => [ `command-proxy-with-arg`, env ]);

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

    it(`should assign "null" as initial value for regular options if the "?" flag is set`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a` ]);

        expect(env.baz).to.equal(null);

    });

    it(`should assign "true" when using a regular option long name`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `--bar`, `--baz` ]);

        expect(env.bar).to.equal(true);
        expect(env.baz).to.equal(true);

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

        let [ command, env ] = concierge.run(null, [ `command-a`, `--no-foo`, `--without-foobar`, `--no-baz` ]);

        expect(env.foo).to.equal(false);
        expect(env.withFoobar).to.equal(false);
        expect(env.baz).to.equal(false);

    });

    it(`should assign "false" when using a --no- option short name`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `-F`, `-X` ]);

        expect(env.foo).to.equal(false);
        expect(env.withFoobar).to.equal(false);

    });

    it(`should assign "0" as initial value for short options expecting to be repeated`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a` ]);

        expect(env.verbose).to.equal(0);

    });

    it(`should count the number of time short options are repeated when it's expected they will be`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `-vv` ]);

        expect(env.verbose).to.equal(2);

    });

    it(`should add together the number of time short options are repeated when it's expected they will be`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `-v`, `-v` ]);

        expect(env.verbose).to.equal(2);

    });

    it(`should not set a greater value on short options than the number of time a value is expected to be repeated`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `-vvvvvvvvv` ]);

        expect(env.verbose).to.equal(3);

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

    it(`should assign an empty array of strings when an argument-aware option that accepts multiple arguments received none`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a` ]);

        expect(env.manyArgs).to.deep.equal([]);

    });

    it(`should assign an array of strings when using an argument-aware option that accepts multiple arguments (single argument)`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `--many-args`, `A` ]);

        expect(env.manyArgs).to.deep.equal([`A`]);

    });

    it(`should assign an array of strings when using an argument-aware option that accepts multiple arguments (multiple arguments)`, () => {

        let [ command, env ] = concierge.run(null, [ `command-a`, `--many-args`, `A`, `--many-args`, `B` ]);

        expect(env.manyArgs).to.deep.equal([`A`, `B`]);

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

        // This is now impossible - we must always lock the command when we land on a proxy command,
        // and aliases are implemented as syntactic sugar over proxy commands. So we can't continue
        // to parse nested commands before aliases in the current state.

        let [ command, env ] = concierge.run(null, [ `b`, `foobar` ]);

        expect(command).to.equal(`foobar`);

    });

    it(`should proxy the arguments for commands configured as such (no arguments)`, () => {

        let [ command, env ] = concierge.run(null, [ `command-proxy` ]);

        expect(command).to.equal(`command-proxy`);
        expect(env.rest).to.deep.equal([]);

    });

    it(`should proxy the arguments for commands configured as such (positional arguments)`, () => {

        let [ command, env ] = concierge.run(null, [ `command-proxy`, `hello`, `world` ]);

        expect(command).to.equal(`command-proxy`);
        expect(env.rest).to.deep.equal([ `hello`, `world` ]);

    });

    it(`should proxy the arguments for commands configured as such (options)`, () => {

        let [ command, env ] = concierge.run(null, [ `command-proxy`, `--hello`, `--world` ]);

        expect(command).to.equal(`command-proxy`);
        expect(env.rest).to.deep.equal([ `--hello`, `--world` ]);

    });

    it(`should proxy the arguments for commands configured as such (mixed, positional first)`, () => {

        let [ command, env ] = concierge.run(null, [ `command-proxy`, `hello`, `--world`, `foo`, `--bar` ]);

        expect(command).to.equal(`command-proxy`);
        expect(env.rest).to.deep.equal([ `hello`, `--world`, `foo`, `--bar` ]);

    });

    it(`should proxy the arguments for commands configured as such (mixed, options first)`, () => {

        let [ command, env ] = concierge.run(null, [ `command-proxy`, `--hello`, `world`, `--foo`, `bar` ]);

        expect(command).to.equal(`command-proxy`);
        expect(env.rest).to.deep.equal([ `--hello`, `world`, `--foo`, `bar` ]);

    });

    it(`should not proxy the explicitly defined positional options`, () => {

        let [ command, env ] = concierge.run(null, [ `command-proxy-with-arg`, `foo`, `bar` ]);

        expect(command).to.equal(`command-proxy-with-arg`);
        expect(env.arg).to.equal(`foo`);
        expect(env.rest).to.deep.equal([ `bar` ]);

    });

    it(`should interpret the option flags provided before explicitly defined positional options`, () => {

        let [ command, env ] = concierge.run(null, [ `command-proxy-with-arg`, `--foo`, `foo`, `bar` ]);

        expect(command).to.equal(`command-proxy-with-arg`);
        expect(env.foo).to.equal(true);
        expect(env.arg).to.equal(`foo`);
        expect(env.rest).to.deep.equal([ `bar` ]);

    });

});
