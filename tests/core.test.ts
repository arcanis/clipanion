import {expect}                           from 'chai';

import {Cli, Command, Definition, Parsed} from '../sources/core';

const makeCli = <T>(definitions: T[]) => {
    const cli = new Cli<{
        index: number;
        definition: T;
        parsed: Parsed;
    }>();

    for (let t = 0; t < definitions.length; ++t) {
        const definition = definitions[t];

        cli.register(new Command(definition, parsed => ({
            index: t,
            definition,
            parsed,
        })));
    }

    return cli;
}

describe(`Core`, () => {
    it(`should select the default command when using no arguments`, () => {
        const cli = makeCli([{path: []}]);

        const {index} = cli.process([]);
        expect(index).to.equal(0);
    });

    it(`should select the default command when using mandatory positional arguments`, () => {
        const cli = makeCli([{path: [], positionals: {minimum: 2}}]);

        const {index} = cli.process([`foo`, `bar`]);
        expect(index).to.equal(0);
    });

    it(`should select commands by their path`, () => {
        const cli = makeCli([{path: [`foo`]}, {path: [`bar`]}]);

        const {index: index1} = cli.process([`foo`]);
        expect(index1).to.equal(0);

        const {index: index2} = cli.process([`bar`]);
        expect(index2).to.equal(1);
    });

    it(`should select commands by their mandatory positional arguments`, () => {
        const cli = makeCli([{path: []}, {path: [], positionals: {minimum: 1}}]);

        const {index} = cli.process([`foo`]);
        expect(index).to.equal(1);
    });

    it(`should select commands by their simple options`, () => {
        const cli = makeCli([{options: {simple: new Set([`-x`])}}, {options: {simple: new Set([`-y`])}}]);

        const {index: index1} = cli.process([`-x`]);
        expect(index1).to.equal(0);

        const {index: index2} = cli.process([`-y`]);
        expect(index2).to.equal(1);
    });

    it(`should select commands by their complex values`, () => {
        const cli = makeCli([{options: {complex: new Set([`-x`])}}, {options: {complex: new Set([`-y`])}}]);

        const {index: index1} = cli.process([`-x`, `foo`]);
        expect(index1).to.equal(0);

        const {index: index2} = cli.process([`-y`, `bar`]);
        expect(index2).to.equal(1);
    });

    it(`should prefer longer paths over mandatory arguments`, () => {
        const cli = makeCli([{path: [`foo`]}, {positionals: {minimum: 1}}]);

        const {index} = cli.process([`foo`]);
        expect(index).to.equal(0);
    });

    it(`should prefer longer paths over mandatory arguments (reversed)`, () => {
        const cli = makeCli([{positionals: {minimum: 1}}, {path: [`foo`]}]);

        const {index} = cli.process([`foo`]);
        expect(index).to.equal(1);
    });

    it(`should prefer longer paths over optional arguments`, () => {
        const cli = makeCli([{path: [`foo`]}, {positionals: {maximum: Infinity}}]);

        const {index} = cli.process([`foo`]);
        expect(index).to.equal(0);
    });

    it(`should prefer longer paths over optional arguments (reversed)`, () => {
        const cli = makeCli([{positionals: {maximum: Infinity}}, {path: [`foo`]}]);

        const {index} = cli.process([`foo`]);
        expect(index).to.equal(1);
    });

    it(`should prefer mandatory arguments over optional arguments`, () => {
        const cli = makeCli([{positionals: {minimum: 1}}, {positionals: {maximum: Infinity}}]);

        const {index} = cli.process([`foo`]);
        expect(index).to.equal(0);
    });

    it(`should prefer mandatory arguments over optional arguments (reversed)`, () => {
        const cli = makeCli([{positionals: {maximum: Infinity}}, {positionals: {minimum: 1}}]);

        const {index} = cli.process([`foo`]);
        expect(index).to.equal(1);
    });

    it(`should fallback from path to mandatory arguments if needed`, () => {
        const cli = makeCli([{path: [`foo`]}, {positionals: {minimum: 1}}]);

        const {index} = cli.process([`bar`]);
        expect(index).to.equal(1);
    });

    it(`should fallback from path to mandatory arguments if needed (reversed)`, () => {
        const cli = makeCli([{positionals: {minimum: 1}}, {path: [`foo`]}]);

        const {index} = cli.process([`bar`]);
        expect(index).to.equal(0);
    });

    it(`should fallback from path to optional arguments if needed`, () => {
        const cli = makeCli([{path: [`foo`]}, {positionals: {maximum: Infinity}}]);

        const {index} = cli.process([`bar`]);
        expect(index).to.equal(1);
    });

    it(`should fallback from path to optional arguments if needed (reversed)`, () => {
        const cli = makeCli([{positionals: {maximum: Infinity}}, {path: [`foo`]}]);

        const {index} = cli.process([`bar`]);
        expect(index).to.equal(0);
    });

    it(`should extract booleans from simple options`, () => {
        const cli = makeCli([{options: {simple: new Set([`-x`])}}]);

        const {parsed} = cli.process([`-x`]);
        expect(parsed.options).to.deep.equal([{type: `option`, name: `-x`, value: true}]);
    });

    it(`should extract strings from complex options`, () => {
        const cli = makeCli([{options: {complex: new Set([`-x`])}}]);

        const {parsed} = cli.process([`-x`, `foo`]);
        expect(parsed.options).to.deep.equal([{type: `option`, name: `-x`, value: `foo`}]);
    });

    it(`should aggregate the options as they are found`, () => {
        const cli = makeCli([{options: {simple: new Set([`-x`, `-y`, `-z`]), complex: new Set([`-u`, `-v`, `-w`])}}]);

        const {parsed: parsed1} = cli.process([`-x`, `-u`, `foo`, `-y`, `-v`, `bar`, `-y`]);
        expect(parsed1.options).to.deep.equal([
            {type: `option`, name: `-x`, value: true},
            {type: `option`, name: `-u`, value: `foo`},
            {type: `option`, name: `-y`, value: true},
            {type: `option`, name: `-v`, value: `bar`},
            {type: `option`, name: `-y`, value: true},
        ]);

        const {parsed: parsed2} = cli.process([`-z`, `-y`, `-x`]);
        expect(parsed2.options).to.deep.equal([
            {type: `option`, name: `-z`, value: true},
            {type: `option`, name: `-y`, value: true},
            {type: `option`, name: `-x`, value: true},
        ]);
    });

    it(`should aggregate the mandatory arguments`, () => {
        const cli = makeCli([{positionals: {minimum: 2}}]);

        const {parsed} = cli.process([`foo`, `bar`]);
        expect(parsed.positionals).to.deep.equal([`foo`, `bar`]);
    });

    it(`should aggregate the optional arguments`, () => {
        const cli = makeCli([{positionals: {maximum: 2}}]);

        const {parsed} = cli.process([`foo`, `bar`]);
        expect(parsed.positionals).to.deep.equal([`foo`, `bar`]);
    });

    it(`should accept as few optional arguments as possible`, () => {
        const cli = makeCli([{positionals: {maximum: 2}}]);

        const {parsed: parsed1} = cli.process([]);
        expect(parsed1.positionals).to.deep.equal([]);

        const {parsed: parsed2} = cli.process([`foo`]);
        expect(parsed2.positionals).to.deep.equal([`foo`]);
    });

    it(`should accept a mix of mandatory and optional arguments`, () => {
        const cli = makeCli([{positionals: {minimum: 1, maximum: 2}}]);

        const {parsed: parsed1} = cli.process([`foo`]);
        expect(parsed1.positionals).to.deep.equal([`foo`]);

        const {parsed: parsed2} = cli.process([`foo`, `bar`]);
        expect(parsed2.positionals).to.deep.equal([`foo`, `bar`]);
    });

    it(`should accept any option as positional argument when proxies are enabled`, () => {
        const cli = makeCli([{positionals: {maximum: Infinity, proxy: true}}]);

        const {parsed: parsed1} = cli.process([`--foo`, `--bar`]);
        expect(parsed1.positionals).to.deep.equal([`--foo`, `--bar`]);
    });
});
