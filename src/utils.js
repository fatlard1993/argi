export const escapeRegex = string => string.replaceAll(/[$()*+.?[\\\]^{|}]/g, '\\$&');

export const parseBool = (value, defaultValue = value) => {
  if (/^(true|1)$/i.test(value)) return true;
  if (/^(false|0)$/i.test(value)) return false;
  return defaultValue;
};

export const parseInteger = (value, defaultValue = value) => {
  if (/^([0-9]|[1-9][0-9]+)$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  return defaultValue;
};

export const parseCsv = (value, defaultValue = value) => {
  try {
    return value.split(',');
  } catch {
    return defaultValue;
  }
};

export const parseJson = (value, defaultValue = value) => {
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
};

export const pallette = {
	__reset: '\x1b[0m',
	bold: '\x1b[1m',
	white: '\x1b[37m',
	cyan: '\x1b[36m',
	magenta: '\x1b[35m',
	blue: '\x1b[34m',
	yellow: '\x1b[33m',
	green: '\x1b[32m',
	red: '\x1b[31m',
	black: '\x1b[30m',
	background: {
		white: '\x1b[47m',
		cyan: '\x1b[46m',
		magenta: '\x1b[45m',
		blue: '\x1b[44m',
		yellow: '\x1b[43m',
		green: '\x1b[42m',
		red: '\x1b[41m',
		black: '\x1b[40m',
	},
};

export const paint = (text, ...styles) => `${styles.join('')}${text}${pallette.__reset}`;