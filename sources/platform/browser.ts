import {type getCaptureActivator as GetCaptureActivatorType} from './node';

export function getDefaultColorDepth() {
  return 1;
}

export const getCaptureActivator: typeof GetCaptureActivatorType = () => {
  throw new Error(`The enableCapture option cannot be used from within a browser environment`);
};
