import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { escapeRegex, parseBool, parseInteger, parseCsv, palette, paint, findProjectRoot } from './utils.js';

describe('escapeRegex', () => {
	test('should escape special regex characters', () => {
		expect(escapeRegex('hello.world')).toBe('hello\\.world');
		expect(escapeRegex('test[123]')).toBe('test\\[123\\]');
		expect(escapeRegex('$100 (sale)*')).toBe('\\$100 \\(sale\\)\\*');
		expect(escapeRegex('{name: value}')).toBe('\\{name: value\\}');
		expect(escapeRegex('path\\to\\file')).toBe('path\\\\to\\\\file');
	});

	test('should handle empty string', () => {
		expect(escapeRegex('')).toBe('');
	});

	test('should handle strings with no special characters', () => {
		expect(escapeRegex('hello')).toBe('hello');
		expect(escapeRegex('test123')).toBe('test123');
	});
});

describe('parseBool', () => {
	test('should parse truthy values', () => {
		expect(parseBool('true')).toBe(true);
		expect(parseBool('TRUE')).toBe(true);
		expect(parseBool('True')).toBe(true);
		expect(parseBool('1')).toBe(true);
	});

	test('should parse falsy values', () => {
		expect(parseBool('false')).toBe(false);
		expect(parseBool('FALSE')).toBe(false);
		expect(parseBool('False')).toBe(false);
		expect(parseBool('0')).toBe(false);
	});

	test('should return default value for invalid inputs', () => {
		expect(parseBool('maybe')).toBe('maybe');
		expect(parseBool('yes', 'unknown')).toBe('unknown');
		expect(parseBool('', null)).toBe(null);
		expect(parseBool('2')).toBe('2');
	});

	test('should handle default value same as input', () => {
		expect(parseBool('invalid')).toBe('invalid');
	});
});

describe('parseInteger', () => {
	test('should parse valid integers', () => {
		expect(parseInteger('0')).toBe(0);
		expect(parseInteger('123')).toBe(123);
		expect(parseInteger('999')).toBe(999);
		expect(parseInteger('1')).toBe(1);
	});

	test('should parse negative integers', () => {
		expect(parseInteger('-1')).toBe(-1);
		expect(parseInteger('-123')).toBe(-123);
		expect(parseInteger('-0')).toBe(-0);
	});

	test('should reject invalid integers', () => {
		expect(parseInteger('abc')).toBe('abc');
		expect(parseInteger('123abc')).toBe('123abc');
		expect(parseInteger('12.34')).toBe('12.34');
		expect(parseInteger('')).toBe('');
		expect(parseInteger('--5')).toBe('--5');
	});

	test('should use default value for invalid inputs', () => {
		expect(parseInteger('abc', -1)).toBe(-1);
		expect(parseInteger('', 0)).toBe(0);
		expect(parseInteger('12.34', null)).toBe(null);
	});

	test('should handle leading zeros correctly', () => {
		expect(parseInteger('007')).toBe('007'); // Should reject due to leading zeros
	});
});

describe('parseCsv', () => {
	test('should parse comma-separated values', () => {
		expect(parseCsv('a,b,c')).toEqual(['a', 'b', 'c']);
		expect(parseCsv('one,two,three')).toEqual(['one', 'two', 'three']);
		expect(parseCsv('1,2,3')).toEqual(['1', '2', '3']);
	});

	test('should handle single values', () => {
		expect(parseCsv('single')).toEqual(['single']);
	});

	test('should handle empty values', () => {
		expect(parseCsv('')).toEqual(['']);
		expect(parseCsv('a,,c')).toEqual(['a', '', 'c']);
	});

	test('should handle spaces', () => {
		expect(parseCsv('a, b, c')).toEqual(['a', ' b', ' c']);
	});

	test('should use default value on error', () => {
		// Since split doesn't throw, test with edge cases
		expect(parseCsv('a,b,c', 'default')).toEqual(['a', 'b', 'c']);
	});
});

describe('palette', () => {
	test('should contain all expected color codes', () => {
		expect(palette.__reset).toBe('\x1b[0m');
		expect(palette.bold).toBe('\x1b[1m');
		expect(palette.red).toBe('\x1b[31m');
		expect(palette.green).toBe('\x1b[32m');
		expect(palette.blue).toBe('\x1b[34m');
		expect(palette.white).toBe('\x1b[37m');
	});

	test('should contain background colors', () => {
		expect(palette.background.red).toBe('\x1b[41m');
		expect(palette.background.green).toBe('\x1b[42m');
		expect(palette.background.blue).toBe('\x1b[44m');
		expect(palette.background.white).toBe('\x1b[47m');
	});
});

describe('paint', () => {
	let originalIsTTY;
	let originalNoColor;

	beforeEach(() => {
		originalIsTTY = process.stdout.isTTY;
		originalNoColor = process.env.NO_COLOR;
		process.stdout.isTTY = true;
		delete process.env.NO_COLOR;
	});

	afterEach(() => {
		process.stdout.isTTY = originalIsTTY;
		if (originalNoColor !== undefined) process.env.NO_COLOR = originalNoColor;
		else delete process.env.NO_COLOR;
	});

	test('should apply single style', () => {
		const result = paint('hello', palette.red);
		expect(result).toBe('\x1b[31mhello\x1b[0m');
	});

	test('should apply multiple styles', () => {
		const result = paint('bold red', palette.red, palette.bold);
		expect(result).toBe('\x1b[31m\x1b[1mbold red\x1b[0m');
	});

	test('should handle no styles when TTY', () => {
		const result = paint('plain');
		expect(result).toBe('plain\x1b[0m');
	});

	test('should handle empty text', () => {
		const result = paint('', palette.blue);
		expect(result).toBe('\x1b[34m\x1b[0m');
	});

	test('should combine foreground and background colors', () => {
		const result = paint('text', palette.white, palette.background.black);
		expect(result).toBe('\x1b[37m\x1b[40mtext\x1b[0m');
	});

	test('should return plain text when NO_COLOR is set', () => {
		process.env.NO_COLOR = '';
		expect(paint('hello', palette.red)).toBe('hello');
	});

	test('should return plain text when NO_COLOR is any value', () => {
		process.env.NO_COLOR = '1';
		expect(paint('styled', palette.bold, palette.blue)).toBe('styled');
	});

	test('should return plain text when stdout is not a TTY', () => {
		process.stdout.isTTY = undefined;
		expect(paint('hello', palette.red)).toBe('hello');
	});
});

describe('findProjectRoot', () => {
	const tmpBase = join(tmpdir(), 'argi-test-findroot');

	afterEach(() => {
		rmSync(tmpBase, { recursive: true, force: true });
	});

	test('should find package.json in the given directory', () => {
		mkdirSync(tmpBase, { recursive: true });
		writeFileSync(join(tmpBase, 'package.json'), '{}');

		expect(findProjectRoot(tmpBase)).toBe(tmpBase);
	});

	test('should traverse up to find package.json in a parent', () => {
		const nested = join(tmpBase, 'a', 'b', 'c');
		mkdirSync(nested, { recursive: true });
		writeFileSync(join(tmpBase, 'package.json'), '{}');

		expect(findProjectRoot(nested)).toBe(tmpBase);
	});

	test('should throw when no package.json exists in any ancestor', () => {
		const isolated = join(tmpBase, 'no-pkg');
		mkdirSync(isolated, { recursive: true });

		// Walk up from isolated — tmpBase has no package.json in this test, so traversal
		// reaches the filesystem root. The root on this machine may have one, so pass a
		// path guaranteed not to exist instead of relying on tmpBase isolation.
		expect(() => findProjectRoot('/nonexistent/path/that/does/not/exist')).toThrow();
	});

	test('should default to process.cwd()', () => {
		const result = findProjectRoot();
		// Should find the argi project's own package.json
		expect(result).toContain('argi');
	});
});
