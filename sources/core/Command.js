import * as flags from './flags';

export class Command {

    constructor(definition) {

        this.path = definition.path;
        this.description = null;
        this.flags = this.path.length > 0 ? 0 : flags.DEFAULT_COMMAND;

        this.requiredArguments = definition.requiredArguments;
        this.optionalArguments = definition.optionalArguments;

        this.spread = definition.spread;

        this.options = definition.options;

        this.validators = {};
        this.run = () => {};

    }

    flag(flags) {

        this.flags |= flags;

        return this;

    }

    validate(optionName, validator) {

        this.validators[optionName] = validator;

        return this;

    }

    describe(description) {

        this.description = description;

        return this;

    }

    action(action) {

        this.run = action;

        return this;

    }

    check(topLevelNames) {

        let shortNames = this.options.map(option => option.shortName).filter(name => name);
        let longNames = this.options.map(option => option.longName).filter(name => name);

        let localNames = [].concat(shortNames, longNames, this.requiredArguments, this.optionalArguments);

        if (new Set(localNames).size !== localNames.length)
            throw new Error(`Some parameter names used inside a same command are conflicting together`);

        let allNames = localNames.concat(topLevelNames);

        if (new Set(allNames).size !== allNames.length) {
            throw new Error(`Some parameter names from a command are conflicting with the top-level parameters`);
        }

    }

}
