function extractContent(text, paragraphs) {

    text = text.replace(/^[\t ]+|[\t ]+$/gm, ``);
    text = text.replace(/^\n+|\n+$/g, ``);
    text = text.replace(/\n(\n)?\n*/g, `$1`);

    if (paragraphs) {
        text = text.split(/\n/g).map(paragraph => {
            return paragraph.match(/(.{1,80})(?: |$)/g).join(`\n`);
        }).join(`\n\n`);
    }

    return text ? text + `\n` : ``;

}

export class Command {

    constructor(concierge, definition) {

        this.concierge = concierge;

        // An array with the command "path" (ie the words that are required to run the command)
        this.path = definition.path;

        // The category where this command belongs in the help
        this.category = null;

        // The command description, has displayed in the help
        this.description = null;

        // The command details, written when printing the usage of a specific command
        this.details = ``;

        // Various commands examples that can good introduction to figure out how to use the command
        this.examples = [];

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

    alias(pattern) {

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

    aliases(... patterns) {

        for (let pattern of patterns)
            this.alias(pattern);

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

    categorize(category) {

        this.category = extractContent(category, false);

        return this;

    }

    describe(description) {

        this.description = extractContent(description, false);

        return this;

    }

    detail(details) {

        this.details = extractContent(details, true);

        return this;

    }

    example(description, example) {

        this.examples.push({
            description: extractContent(description, true),
            example: extractContent(example, false),
        });

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
