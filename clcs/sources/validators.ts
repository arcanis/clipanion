const BINARY_NAME_REGEXP = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const validateBinaryName = (binaryName: string) => {
  if (!BINARY_NAME_REGEXP.test(binaryName)) {
    throw new Error(`Invalid binaryName: ${JSON.stringify(binaryName)} (must match ${BINARY_NAME_REGEXP.toString()})`);
  }
};
