exports.UsageError = class UsageError extends Error {

    constructor(message) {

        super(message);

        this.isUsageError = true;

    }

};
