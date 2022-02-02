require(`string.prototype.replaceall`).shim();

export {setupShellConfigurationFile} from './setupShellConfigurationFile';
export {cleanupShellConfigurationFile} from './cleanupShellConfigurationFile';
export {processCompletionProviderRequest} from './processCompletionProviderRequest';
export {processCompletionRequest} from './processCompletionRequest';
export {debugCompletionRequest} from './debugCompletionRequest';

export {getSupportedShells} from './drivers';
export {validateBinaryName} from './validators';

export * from './types';
export * as stdoutUtils from './stdoutUtils';
