import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Prepends backslashes to regex-special characters so the string matches literally in a RegExp.
 * @param {string} string - Raw string to escape
 * @returns {string} Escaped string safe for use in `new RegExp()`
 */
export const escapeRegex = string => string.replaceAll(/[$()*+.?[\\\]^{|}]/g, '\\$&');

/**
 * Converts 'true'/'1' to true, 'false'/'0' to false (case-insensitive). Returns defaultValue otherwise.
 * @param {string} value - String to convert
 * @param {*} [defaultValue] - Returned when value is not a recognized boolean string (defaults to value)
 * @returns {boolean|*} Converted boolean, or defaultValue
 */
export const parseBool = (value, defaultValue = value) => {
	if (/^(true|1)$/i.test(value)) return true;
	if (/^(false|0)$/i.test(value)) return false;
	return defaultValue;
};

/**
 * Converts a string of digits to an integer. Accepts an optional leading minus. Rejects leading zeros and decimals.
 * @param {string} value - String to convert
 * @param {*} [defaultValue] - Returned when value does not match the integer pattern (defaults to value)
 * @returns {number|*} Converted integer, or defaultValue
 */
export const parseInteger = (value, defaultValue = value) => {
	if (/^-?([0-9]|[1-9][0-9]+)$/.test(value)) return Number.parseInt(value, 10);
	return defaultValue;
};

/**
 * Splits a string on commas. No trimming — each element keeps its whitespace.
 * @param {string} value - Comma-separated string
 * @param {*} [defaultValue] - Returned if split throws on non-string input (defaults to value)
 * @returns {string[]|*} Array of substrings, or defaultValue
 */
export const parseCsv = (value, defaultValue = value) => {
	try {
		return value.split(',');
	} catch {
		return defaultValue;
	}
};

/**
 * Runs JSON.parse on the input. Returns defaultValue on syntax errors.
 * @param {string} value - JSON string
 * @param {*} [defaultValue] - Returned when JSON.parse throws (defaults to value)
 * @returns {*} Parsed value, or defaultValue
 */
export const parseJson = (value, defaultValue = value) => {
	try {
		return JSON.parse(value);
	} catch {
		return defaultValue;
	}
};

/**
 * ANSI escape codes for foreground colors, background colors, and text styles.
 * @type {object}
 */
export const palette = {
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
 * Wraps text with ANSI escape codes and appends a reset sequence.
 * Returns plain text when NO_COLOR exists or stdout lacks a TTY.
 * @param {string} text - Text to wrap
 * @param {...string} styles - ANSI codes from palette (joined before text)
 * @returns {string} Styled or plain text
 */
export const paint = (text, ...styles) => {
	if (process.env.NO_COLOR !== undefined || !process.stdout?.isTTY) return text;

	return `${styles.join('')}${text}${palette.__reset}`;
};

/**
 * Walks up from startPath until finding a directory containing package.json.
 * @param {string} [startPath] - Directory to begin traversal (defaults to cwd)
 * @returns {string} Absolute path to the directory containing package.json
 * @throws {Error} When no package.json exists in any ancestor directory
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
