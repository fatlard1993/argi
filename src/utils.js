export const escapeRegex = string => string.replaceAll(/[$()*+.?[\\\]^{|}]/g, '\\$&');

export const transformBoolean = value => ({ true: true, false: false, 1: true, 0: false })[value];

export const exit = () => process.exit(130);
