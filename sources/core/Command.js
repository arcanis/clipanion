export class Command {

    constructor(concierge, definition) {

        this.concierge = concierge;

        // An array with the command "path" (ie the words that are required to run the command)
        this.path = definition.path;

        // The command description, has displayed in the help
        this.description = null;

        // Various flag that affect how the command is seen by the controller
        this.defaultCommand = this.path.length === 0;
        this.hiddenCommand = false;
        this.proxyArguments = false;

        // A list of the names of the required arguments
        this.requiredArguments = definition.requiredArguments;

        // A list of the names of the optional arguments
        this.optionalArguments = definition.optionalArguments;

        // The name of the spread
        this.spread = definition.spread;

        // A list of all the options supported by the command
        this.options = definition.options;

        // A Joi validator, or null if this command doesn't use any validation
        this.validator = null;

        // The function that will be called when running the command
        this.run = () => {};

    }

    aliases(... patterns) {

        for (let pattern of patterns) {

            this.concierge.command(`${pattern} [... rest]`)

                .flags({

                    // Alias must not be displayed as regular commands
                    hiddenCommand: true,

                    // Alias directly forward all of their arguments to the actual command
                    proxyArguments: true,

                })

                .action(args => this.concierge.run(args.argv0, [
                    ... this.path,
                    ... args.rest,
                ]))

            ;

        }

        return this;

    }

    flags(flags) {

        Object.assign(this, flags);

        return this;

    }

    validate(validator) {

        this.validator = validator;

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
