import {expect}                         from 'chai';

import {CliBuilderCallback, CliBuilder} from '../sources/core';

const makeCli = (definitions: CliBuilderCallback<{}>[]) => {
    return CliBuilder.build<{}>(definitions.map(cb => {
        return builder => {
            builder.setContext({});
            cb(builder);
        };
    }));
}

describe(`Core`, () => {
    it(`should select the default command when using no arguments`, () => {
        const cli = makeCli([
            () => {},
        ]);

        const {selectedIndex} = cli.process([]);
        expect(selectedIndex).to.equal(0);
    });

    it(`should select the default command when using mandatory positional arguments`, () => {
        const cli = makeCli([
            b => {
                b.addPositional();
                b.addPositional();
            },
        ]);

        const {selectedIndex} = cli.process([`foo`, `bar`]);
        expect(selectedIndex).to.equal(0);
    });

    it(`should select commands by their path`, () => {
        const cli = makeCli([
            b => {
                b.addPath([`foo`]);
            },
            b => {
                b.addPath([`bar`]);
            },
        ]);

        const {selectedIndex: selectedIndex1} = cli.process([`foo`]);
        expect(selectedIndex1).to.equal(0);

        const {selectedIndex: selectedIndex2} = cli.process([`bar`]);
        expect(selectedIndex2).to.equal(1);
    });

    it(`should select commands by their mandatory positional arguments`, () => {
        const cli = makeCli([
            () => {
                // Nothing to do
            },
            b => {
                b.addPositional();
            },
        ]);

        const {selectedIndex} = cli.process([`foo`]);
        expect(selectedIndex).to.equal(1);
    });

    it(`should select commands by their simple options`, () => {
        const cli = makeCli([
            b => {
                b.addOption({names: [`-x`]});
            },
            b => {
                b.addOption({names: [`-y`]});
            },
        ]);

        const {selectedIndex: selectedIndex1} = cli.process([`-x`]);
        expect(selectedIndex1).to.equal(0);

        const {selectedIndex: selectedIndex2} = cli.process([`-y`]);
        expect(selectedIndex2).to.equal(1);
    });

    it(`should allow options to precede the command paths`, () => {
        const cli = makeCli([
            b => {
                b.addPath([`foo`]);
                b.addOption({names: [`-x`]});
            },
            b => {
                b.addPath([`bar`]);
                b.addOption({names: [`-y`]});
            },
        ]);

        const {selectedIndex: selectedIndex1} = cli.process([`-x`, `foo`]);
        expect(selectedIndex1).to.equal(0);

        const {selectedIndex: selectedIndex2} = cli.process([`-y`, `bar`]);
        expect(selectedIndex2).to.equal(1);
    });

    it(`should select commands by their complex values`, () => {
        const cli = makeCli([
            b => {
                b.addOption({names: [`-x`], arity: 1});
            },
            b => {
                b.addOption({names: [`-y`], arity: 1});
            },
        ]);

        const {selectedIndex: selectedIndex1} = cli.process([`-x`, `foo`]);
        expect(selectedIndex1).to.equal(0);

        const {selectedIndex: selectedIndex2} = cli.process([`-y`, `bar`]);
        expect(selectedIndex2).to.equal(1);
    });

    it(`should prefer longer paths over mandatory arguments`, () => {
        const cli = makeCli([
            b => {
                b.addPath([`foo`]);
            },
            b => {
                b.addPositional();
            },
        ]);

        const {selectedIndex} = cli.process([`foo`]);
        expect(selectedIndex).to.equal(0);
    });

    it(`should prefer longer paths over mandatory arguments (reversed)`, () => {
        const cli = makeCli([
            b => {
                b.addPositional();
            },
            b => {
                b.addPath([`foo`]);
            },
        ]);

        const {selectedIndex} = cli.process([`foo`]);
        expect(selectedIndex).to.equal(1);
    });

    it(`should prefer longer paths over mandatory arguments (prefixed)`, () => {
        const cli = makeCli([
            b => {
                b.addPath([`prfx`, `foo`]);
            },
            b => {
                b.addPath([`prfx`]);
                b.addPositional();
            },
        ]);

        const {selectedIndex} = cli.process([`prfx`, `foo`]);
        expect(selectedIndex).to.equal(0);
    });

    it(`should prefer longer paths over optional arguments`, () => {
        const cli = makeCli([
            b => {
                b.addPath([`foo`]);
            },
            b => {
                b.addPositional({required: false});
            },
        ]);

        const {selectedIndex} = cli.process([`foo`]);
        expect(selectedIndex).to.equal(0);
    });

    it(`should prefer longer paths over optional arguments (reversed)`, () => {
        const cli = makeCli([
            b => {
                b.addPositional({required: false});
            },
            b => {
                b.addPath([`foo`]);
            },
        ]);

        const {selectedIndex} = cli.process([`foo`]);
        expect(selectedIndex).to.equal(1);
    });

    it(`should prefer longer paths over optional arguments (prefixed)`, () => {
        const cli = makeCli([
            b => {
                b.addPath([`prfx`, `foo`]);
            },
            b => {
                b.addPath([`prfx`]);
                b.addPositional({required: false});
            },
        ]);

        const {selectedIndex} = cli.process([`prfx`, `foo`]);
        expect(selectedIndex).to.equal(0);
    });

    it(`should prefer mandatory arguments over optional arguments`, () => {
        const cli = makeCli([
            b => {
                b.addPositional();
            },
            b => {
                b.addPositional({required: false});
            },
        ]);

        const {selectedIndex} = cli.process([`foo`]);
        expect(selectedIndex).to.equal(0);
    });

    it(`should prefer mandatory arguments over optional arguments (reversed)`, () => {
        const cli = makeCli([
            b => {
                b.addPositional({required: false});
            },
            b => {
                b.addPositional();
            },
        ]);

        const {selectedIndex} = cli.process([`foo`]);
        expect(selectedIndex).to.equal(1);
    });

    it(`should fallback from path to mandatory arguments if needed`, () => {
        const cli = makeCli([
            b => {
                b.addPath([`foo`]);
            },
            b => {
                b.addPositional();
            },
        ]);

        const {selectedIndex} = cli.process([`bar`]);
        expect(selectedIndex).to.equal(1);
    });

    it(`should fallback from path to mandatory arguments if needed (reversed)`, () => {
        const cli = makeCli([
            b => {
                b.addPositional();
            },
            b => {
                b.addPath([`foo`]);
            },
        ]);

        const {selectedIndex} = cli.process([`bar`]);
        expect(selectedIndex).to.equal(0);
    });

    it(`should fallback from path to mandatory arguments if needed (prefixed)`, () => {
        const cli = makeCli([
            b => {
                b.addPath([`prfx`, `foo`]);
            },
            b => {
                b.addPath([`prfx`]);
                b.addPositional();
            },
        ]);

        const {selectedIndex} = cli.process([`prfx`, `bar`]);
        expect(selectedIndex).to.equal(1);
    });

    it(`should fallback from path to optional arguments if needed`, () => {
        const cli = makeCli([
            b => {
                b.addPath([`foo`]);
            },
            b => {
                b.addPositional({required: false});
            },
        ]);

        const {selectedIndex} = cli.process([`bar`]);
        expect(selectedIndex).to.equal(1);
    });

    it(`should fallback from path to optional arguments if needed (reversed)`, () => {
        const cli = makeCli([
            b => {
                b.addPositional({required: false});
            },
            b => {
                b.addPath([`foo`]);
            },
        ]);

        const {selectedIndex} = cli.process([`bar`]);
        expect(selectedIndex).to.equal(0);
    });

    it(`should fallback from path to optional arguments if needed (prefixed)`, () => {
        const cli = makeCli([
            b => {
                b.addPath([`prfx`, `foo`]);
            },
            b => {
                b.addPath([`prfx`]);
                b.addPositional();
            },
        ]);

        const {selectedIndex} = cli.process([`prfx`, `bar`]);
        expect(selectedIndex).to.equal(1);
    });

    it(`should extract booleans from simple options`, () => {
        const cli = makeCli([
            b => {
                b.addOption({names: [`-x`]});
            },
        ]);

        const {options} = cli.process([`-x`]);
        expect(options).to.deep.equal([
            {name: `-x`, value: true},
        ]);
    });

    it(`should extract booleans from batch options`, () => {
        const cli = makeCli([
            b => {
                b.addOption({names: [`-x`, `-y`]});
            },
        ]);

        const {options} = cli.process([`-xy`]);
        expect(options).to.deep.equal([
            {name: `-x`, value: true},
            {name: `-y`, value: true},
        ]);
    });

    it(`should invert booleans when using --no-`, () => {
        const cli = makeCli([
            b => {
                b.addOption({names: [`--foo`]});
            },
        ]);

        const {options} = cli.process([`--no-foo`]);
        expect(options).to.deep.equal([
            {name: `--foo`, value: false},
        ]);
    });

    it(`should extract strings from complex options`, () => {
        const cli = makeCli([
            b => {
                b.addOption({names: [`-x`], arity: 1});
            },
        ]);

        const {options} = cli.process([`-x`, `foo`]);
        expect(options).to.deep.equal([
            {name: `-x`, value: `foo`},
        ]);
    });

    it(`should aggregate the options as they are found`, () => {
        const cli = makeCli([
            b => {
                b.addOption({names: [`-x`]});
                b.addOption({names: [`-y`]});
                b.addOption({names: [`-z`]});
                b.addOption({names: [`-u`], arity: 1});
                b.addOption({names: [`-v`], arity: 1});
                b.addOption({names: [`-w`], arity: 1});
            },
        ]);

        const {options: options1} = cli.process([`-x`, `-u`, `foo`, `-y`, `-v`, `bar`, `-y`]);
        expect(options1).to.deep.equal([
            {name: `-x`, value: true},
            {name: `-u`, value: `foo`},
            {name: `-y`, value: true},
            {name: `-v`, value: `bar`},
            {name: `-y`, value: true},
        ]);

        const {options: options2} = cli.process([`-z`, `-y`, `-x`]);
        expect(options2).to.deep.equal([
            {name: `-z`, value: true},
            {name: `-y`, value: true},
            {name: `-x`, value: true},
        ]);
    });

    it(`should aggregate the mandatory arguments`, () => {
        const cli = makeCli([
            b => {
                b.addPositional();
                b.addPositional();
            },
        ]);

        const {positionals} = cli.process([`foo`, `bar`]);
        expect(positionals).to.deep.equal([
            {value: `foo`, extra: false},
            {value: `bar`, extra: false},
        ]);
    });

    it(`should aggregate the optional arguments`, () => {
        const cli = makeCli([
            b => {
                b.addPositional({required: false});
                b.addPositional({required: false});
            },
        ]);

        const {positionals} = cli.process([`foo`, `bar`]);
        expect(positionals).to.deep.equal([
            {value: `foo`, extra: true},
            {value: `bar`, extra: true},
        ]);
    });

    it(`should accept as few optional arguments as possible`, () => {
        const cli = makeCli([
            b => {
                b.addPositional({required: false});
                b.addPositional({required: false});
            },
        ]);

        const {positionals: positionals1} = cli.process([]);
        expect(positionals1).to.deep.equal([]);

        const {positionals: positionals2} = cli.process([`foo`]);
        expect(positionals2).to.deep.equal([
            {value: `foo`, extra: true},
        ]);
    });

    it(`should accept a mix of mandatory and optional arguments`, () => {
        const cli = makeCli([
            b => {
                b.addPositional();
                b.addPositional({required: false});
            },
        ]);

        const {positionals: positionals1} = cli.process([`foo`]);
        expect(positionals1).to.deep.equal([
            {value: `foo`, extra: false},
        ]);

        const {positionals: positionals2} = cli.process([`foo`, `bar`]);
        expect(positionals2).to.deep.equal([
            {value: `foo`, extra: false},
            {value: `bar`, extra: true},
        ]);
    });

    it(`should accept any option as positional argument when proxies are enabled`, () => {
        const cli = makeCli([
            b => {
                b.addProxy();
            },
        ]);

        const {positionals} = cli.process([`--foo`, `--bar`]);
        expect(positionals).to.deep.equal([
            {value: `--foo`, extra: true},
            {value: `--bar`, extra: true},
        ]);
    });

    it(`should throw acceptable errors when passing an extraneous option`, () => {
        const cli = makeCli([
            () => {
                // Nothing to do
            },
        ]);

        expect(() => {
            cli.process([`--foo`]);
        }).to.throw(`Unsupported option name ("--foo")`);
    });

    it(`should throw acceptable errors when passing extraneous arguments`, () => {
        const cli = makeCli([
            b => {
                // Nothing to do
            },
        ]);

        expect(() => {
            cli.process([`foo`]);
        }).to.throw(`Extraneous positional argument ("foo")`);
    });

    it(`should throw acceptable errors when a command is incomplete`, () => {
        const cli = makeCli([
            b => {
                b.addPath([`foo`]);
            },
        ]);

        expect(() => {
            cli.process([]);
        }).to.throw(`Command not found; did you mean:`);
    });

    it(`should throw acceptable errors when a command is incomplete (multiple choices)`, () => {
        const cli = makeCli([
            b => {
                b.addPath([`foo`]);
            },
            b => {
                b.addPath([`bar`]);
            },
        ]);

        expect(() => {
            cli.process([]);
        }).to.throw(`Command not found; did you mean one of:`);
    });

    it(`should throw acceptable errors when omitting mandatory positional arguments`, () => {
        const cli = makeCli([
            b => {
                b.addPositional();
            },
        ]);

        expect(() => {
            cli.process([]);
        }).to.throw(`Not enough positional arguments`);
    });

    it(`should throw acceptable errors when writing invalid arguments`, () => {
        const cli = makeCli([
            b => {
                // Nothing to do
            },
        ]);

        expect(() => {
            cli.process([`-%#@$%#()@`]);
        }).to.throw(`Invalid option name ("-%#@$%#()@")`);
    });
});
