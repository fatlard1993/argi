import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Escapes special regex characters in a string
 * @param {string} string - String to escape
 * @returns {string} Escaped string safe for RegExp
 */
export const escapeRegex = string => string.replaceAll(/[$()*+.?[\\\]^{|}]/g, '\\$&');

/**
 * Parses string to boolean (supports 'true', '1', 'false', '0')
 * @param {string} value - String to parse
 * @param {*} [defaultValue=value] - Fallback if parsing fails
 * @returns {boolean|*} Parsed boolean or default
 */
export const parseBool = (value, defaultValue = value) => {
	if (/^(true|1)$/i.test(value)) return true;
	if (/^(false|0)$/i.test(value)) return false;
	return defaultValue;
};

/**
 * Parses string to integer (digits only)
 * @param {string} value - String to parse
 * @param {*} [defaultValue=value] - Fallback if parsing fails
 * @returns {number|*} Parsed integer or default
 */
export const parseInteger = (value, defaultValue = value) => {
	if (/^([0-9]|[1-9][0-9]+)$/.test(value)) return Number.parseInt(value, 10);
	return defaultValue;
};

/**
 * Parses comma-separated values to array
 * @param {string} value - CSV string to parse
 * @param {*} [defaultValue=value] - Fallback if parsing fails
 * @returns {string[]|*} Array of values or default
 */
export const parseCsv = (value, defaultValue = value) => {
	try {
		return value.split(',');
	} catch {
		return defaultValue;
	}
};

/**
 * Parses JSON string to object/value
 * @param {string} value - JSON string to parse
 * @param {*} [defaultValue=value] - Fallback if parsing fails
 * @returns {*} Parsed JSON or default
 */
export const parseJson = (value, defaultValue = value) => {
	try {
		return JSON.parse(value);
	} catch {
		return defaultValue;
	}
};

/**
 * ANSI color codes for terminal styling
 * @type {Object}
 */
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

/**
 * Applies ANSI colors/styles to text
 * @param {string} text - Text to style
 * @param {...string} styles - ANSI codes to apply
 * @returns {string} Styled text with reset
 */
export const paint = (text, ...styles) => `${styles.join('')}${text}${pallette.__reset}`;

/**
 * Finds project root by looking for package.json
 * @param {string} [startPath=process.cwd()] - Directory to start search
 * @returns {string} Path to project root
 * @throws {Error} If package.json not found
 */
export const findProjectRoot = (startPath = process.cwd()) => {
	let currentPath = resolve(startPath);

	while (currentPath !== dirname(currentPath)) {
		const packageJsonPath = join(currentPath, 'package.json');
		if (existsSync(packageJsonPath)) return currentPath;

		currentPath = dirname(currentPath);
	}

	const rootPackageJson = join(currentPath, 'package.json');
	if (existsSync(rootPackageJson)) return currentPath;

	throw new Error('package.json not found in current directory or any parent directory');
};
