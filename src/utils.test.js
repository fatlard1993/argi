import { describe, test, expect } from 'bun:test';
import { escapeRegex, parseBool, parseInteger, parseCsv, parseJson, pallette, paint } from './utils.js';

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

	test('should reject invalid integers', () => {
		expect(parseInteger('abc')).toBe('abc');
		expect(parseInteger('123abc')).toBe('123abc');
		expect(parseInteger('-123')).toBe('-123');
		expect(parseInteger('12.34')).toBe('12.34');
		expect(parseInteger('')).toBe('');
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
		// Since split shouldn't normally throw, test with edge cases
		expect(parseCsv('a,b,c', 'default')).toEqual(['a', 'b', 'c']);
	});
});

describe('parseJson', () => {
	test('should parse valid JSON objects', () => {
		expect(parseJson('{"key": "value"}')).toEqual({ key: 'value' });
		expect(parseJson('{"num": 123, "bool": true}')).toEqual({ num: 123, bool: true });
	});

	test('should parse valid JSON arrays', () => {
		expect(parseJson('[1, 2, 3]')).toEqual([1, 2, 3]);
		expect(parseJson('["a", "b", "c"]')).toEqual(['a', 'b', 'c']);
	});

	test('should parse primitive JSON values', () => {
		expect(parseJson('123')).toBe(123);
		expect(parseJson('true')).toBe(true);
		expect(parseJson('false')).toBe(false);
		expect(parseJson('null')).toBe(null);
		expect(parseJson('"string"')).toBe('string');
	});

	test('should return default value for invalid JSON', () => {
		expect(parseJson('invalid json')).toBe('invalid json');
		expect(parseJson('{"incomplete":', 'fallback')).toBe('fallback');
		expect(parseJson('[1,2,', null)).toBe(null);
		expect(parseJson('undefined')).toBe('undefined');
	});

	test('should handle empty string', () => {
		expect(parseJson('', 'empty')).toBe('empty');
	});
});

describe('pallette', () => {
	test('should contain all expected color codes', () => {
		expect(pallette.__reset).toBe('\x1b[0m');
		expect(pallette.bold).toBe('\x1b[1m');
		expect(pallette.red).toBe('\x1b[31m');
		expect(pallette.green).toBe('\x1b[32m');
		expect(pallette.blue).toBe('\x1b[34m');
		expect(pallette.white).toBe('\x1b[37m');
	});

	test('should contain background colors', () => {
		expect(pallette.background.red).toBe('\x1b[41m');
		expect(pallette.background.green).toBe('\x1b[42m');
		expect(pallette.background.blue).toBe('\x1b[44m');
		expect(pallette.background.white).toBe('\x1b[47m');
	});
});

describe('paint', () => {
	test('should apply single style', () => {
		const result = paint('hello', pallette.red);
		expect(result).toBe('\x1b[31mhello\x1b[0m');
	});

	test('should apply multiple styles', () => {
		const result = paint('bold red', pallette.red, pallette.bold);
		expect(result).toBe('\x1b[31m\x1b[1mbold red\x1b[0m');
	});

	test('should handle no styles', () => {
		const result = paint('plain');
		expect(result).toBe('plain\x1b[0m');
	});

	test('should handle empty text', () => {
		const result = paint('', pallette.blue);
		expect(result).toBe('\x1b[34m\x1b[0m');
	});

	test('should combine foreground and background colors', () => {
		const result = paint('text', pallette.white, pallette.background.black);
		expect(result).toBe('\x1b[37m\x1b[40mtext\x1b[0m');
	});
});
