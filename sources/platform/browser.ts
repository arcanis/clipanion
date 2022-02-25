export function getDefaultColorDepth() {
  return 1;
}

export function getCaptureActivator() {
  throw new Error(`The enableCapture option cannot be used from within a browser environment`);
}
