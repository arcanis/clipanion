exports.getOptionComponent = function getOptionString(options) {

    let components = [];

    for (let option of options) {

        if (option.hidden)
            continue;

        let names = [];

        if (option.shortName)
            names.push(`-${option.shortName}`);

        if (option.longName) {
            if (option.initialValue !== true) {
                names.push(`--${option.longName}`);
            } else if (option.longName.startsWith(`with-`)) {
                names.push(`--without-${option.longName.replace(/^with-/, ``)}`);
            } else {
                names.push(`--no-${option.longName}`);
            }
        }

        if (option.argumentName) {
            components.push(`[${names.join(`,`)} ${option.argumentName}]`);
        } else {
            components.push(`[${names.join(`,`)}]`);
        }

    }

    return components.join(` `);

};

exports.getUsageLine = function getUsageLine(command) {

    let components = [];

    for (const name of command.requiredArguments)
        components.push(`<${name}>`);

    for (const name of command.optionalArguments)
        components.push(`[${name}]`);

    if (command.spread)
        components.push(`[... ${command.spread}]`);

    let optionComponent = exports.getOptionComponent(command.options);

    if (optionComponent.length !== 0)
        components.push(optionComponent);

    return components.join(` `);

};
