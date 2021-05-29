require(`string.prototype.replaceall`).shim();

export {setupShellConfigurationFile} from './setupShellConfigurationFile';
export {cleanupShellConfigurationFile} from './cleanupShellConfigurationFile';
export {processCompletionProviderRequest} from './processCompletionProviderRequest';
export {processCompletionRequest} from './processCompletionRequest';

export * from './types';
