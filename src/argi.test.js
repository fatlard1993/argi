import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import Argi from './argi.js';

// Store original process.argv for restoration
const originalArgv = process.argv;

describe('Argi', () => {
	let exitSpy;
	let consoleSpy;

	beforeEach(() => {
		// Mock process.exit to prevent actual process termination
		exitSpy = spyOn(process, 'exit').mockImplementation(() => {});
		consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
		spyOn(console, 'error').mockImplementation(() => {});
		spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		// Restore original process.argv
		process.argv = originalArgv;
		exitSpy?.mockRestore();
		consoleSpy?.mockRestore();
	});

	describe('constructor', () => {
		test('should create instance with default options', () => {
			const argi = new Argi({ parse: false });
			expect(argi).toBeInstanceOf(Argi);
			expect(argi.helpText).toBe('');
			expect(argi.defaults.type).toBe('string');
		});

		test('should accept custom configuration', () => {
			const argi = new Argi({
				helpText: 'Custom help',
				versionText: 'v1.0.0',
				parse: false,
			});
			expect(argi.helpText).toBe('Custom help');
			expect(argi.versionText).toBe('v1.0.0');
		});

		test('should merge custom defaults', () => {
			const argi = new Argi({
				defaults: {
					type: 'number',
					transform: { custom: val => val.toUpperCase() },
				},
				parse: false,
			});
			expect(argi.defaults.type).toBe('number');
			expect(argi.defaults.transform.custom).toBeDefined();
			expect(argi.defaults.transform.string).toBeDefined(); // Should still have default transforms
		});
	});

	describe('registerOptions', () => {
		test('should register basic flag options', () => {
			const argi = new Argi({ parse: false });
			argi.registerOptions({
				verbose: { type: 'boolean', alias: 'v', description: 'Verbose output' },
				output: { type: 'string', alias: 'o', description: 'Output file' },
			});

			expect(argi.flagNames).toContain('verbose');
			expect(argi.flagNames).toContain('v');
			expect(argi.flagNames).toContain('output');
			expect(argi.flagNames).toContain('o');
			expect(argi.aliasMap.v).toBe('verbose');
			expect(argi.aliasMap.o).toBe('output');
		});

		test('should handle multiple aliases', () => {
			const argi = new Argi({ parse: false });
			argi.registerOptions({
				help: { type: 'boolean', alias: ['h', '?'], description: 'Show help' },
			});

			expect(argi.flagNames).toContain('help');
			expect(argi.flagNames).toContain('h');
			expect(argi.flagNames).toContain('?');
			expect(argi.aliasMap.h).toBe('help');
			expect(argi.aliasMap['?']).toBe('help');
		});

		test('should track required options', () => {
			const argi = new Argi({ parse: false });
			argi.registerOptions({
				required: { required: true, description: 'Required option' },
				optional: { description: 'Optional option' },
			});

			expect(argi.requiredOptions).toContain('required');
			expect(argi.requiredOptions).not.toContain('optional');
		});

		test('should handle sub commands', () => {
			const argi = new Argi({ parse: false });
			argi.registerOptions({
				__subCommands: [{ name: 'action', required: true, description: 'Action to perform' }],
			});

			expect(argi.config.__subCommands).toHaveLength(1);
			expect(argi.config.__subCommands[0].name).toBe('action');
		});

		test('should handle tail arguments', () => {
			const argi = new Argi({ parse: false });
			argi.registerOptions({
				__tail: [{ name: 'files', rest: true, description: 'Files to process' }],
			});

			expect(argi.config.__tail).toHaveLength(1);
			expect(argi.config.__tail[0].name).toBe('files');
			expect(argi.config.__tail[0].rest).toBe(true);
		});
	});

	describe('parsing', () => {
		test('should parse basic string flags', () => {
			process.argv = ['node', 'script.js', '--name', 'John', '--age', '25'];
			const argi = new Argi({
				options: {
					name: { type: 'string', description: 'Name' },
					age: { type: 'string', description: 'Age' },
				},
			});

			expect(argi.options.name).toBe('John');
			expect(argi.options.age).toBe('25');
		});

		test('should parse boolean flags', () => {
			process.argv = ['node', 'script.js', '--verbose'];
			const argi = new Argi({
				options: {
					verbose: { type: 'boolean', description: 'Verbose output' },
				},
			});

			expect(argi.options.verbose).toBe(true);
		});

		test('should parse negated boolean flags', () => {
			process.argv = ['node', 'script.js', '--no-verbose'];
			const argi = new Argi({
				options: {
					verbose: { type: 'boolean', description: 'Verbose mode' },
				},
			});

			expect(argi.options.verbose).toBe(false);
		});

		test('should parse number flags', () => {
			process.argv = ['node', 'script.js', '--count', '42', '--rate', '3.14'];
			const argi = new Argi({
				options: {
					count: { type: 'number', description: 'Count' },
					rate: { type: 'number', description: 'Rate' },
				},
			});

			expect(argi.options.count).toBe(42);
			expect(argi.options.rate).toBe(3.14);
		});

		test('should parse flags with aliases', () => {
			process.argv = ['node', 'script.js', '-v', '-o', 'output.txt'];
			const argi = new Argi({
				options: {
					verbose: { type: 'boolean', alias: 'v', description: 'Verbose' },
					output: { type: 'string', alias: 'o', description: 'Output file' },
				},
			});

			expect(argi.options.verbose).toBe(true);
			expect(argi.options.output).toBe('output.txt');
		});

		test('should parse combined short flags', () => {
			process.argv = ['node', 'script.js', '-v', '-f'];
			const argi = new Argi({
				options: {
					verbose: { type: 'boolean', alias: 'v', description: 'Verbose' },
					force: { type: 'boolean', alias: 'f', description: 'Force' },
				},
			});

			expect(argi.options.verbose).toBe(true);
			expect(argi.options.force).toBe(true);
		});

		test('should parse sub commands', () => {
			process.argv = ['node', 'script.js', 'deploy', 'production'];
			const argi = new Argi({
				options: {
					__subCommands: [
						{ name: 'action', description: 'Action to perform' },
						{ name: 'environment', description: 'Environment' },
					],
				},
			});

			expect(argi.options.action).toBe('deploy');
			expect(argi.options.environment).toBe('production');
		});

		test('should parse tail arguments', () => {
			process.argv = ['node', 'script.js', 'file1.txt', 'file2.txt', 'file3.txt'];
			const argi = new Argi({
				options: {
					__tail: [
						{
							name: 'files',
							rest: true,
							transform: val => val, // Identity transform to preserve array
							description: 'Files to process',
						},
					],
				},
			});

			expect(argi.options.files).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);
		});

		test('should handle pass-through arguments', () => {
			process.argv = ['node', 'script.js', '--verbose', '--', '--pass-through', 'args'];
			const argi = new Argi({
				options: {
					verbose: { type: 'boolean', description: 'Verbose' },
				},
			});

			expect(argi.options.verbose).toBe(true);
			expect(argi.passThrough).toEqual(['--pass-through', 'args']);
		});
	});

	describe('default values', () => {
		test('should apply default values', () => {
			process.argv = ['node', 'script.js'];
			const argi = new Argi({
				options: {
					name: { defaultValue: 'Anonymous', description: 'Name' },
					count: { type: 'number', defaultValue: 0, description: 'Count' },
				},
			});

			expect(argi.options.name).toBe('Anonymous');
			expect(argi.options.count).toBe(0);
		});

		test('should not override provided values with defaults', () => {
			process.argv = ['node', 'script.js', '--name', 'John'];
			const argi = new Argi({
				options: {
					name: { defaultValue: 'Anonymous', description: 'Name' },
				},
			});

			expect(argi.options.name).toBe('John');
		});
	});

	describe('validation', () => {
		test('should validate with test function', () => {
			process.argv = ['node', 'script.js', '--port', '8080'];
			const argi = new Argi({
				options: {
					port: {
						type: 'number',
						test: val => val > 0 && val < 65536,
						description: 'Port number',
					},
				},
			});

			expect(argi.options.port).toBe(8080);
		});

		test('should fail validation with invalid value', () => {
			process.argv = ['node', 'script.js', '--port', '70000'];

			expect(() => {
				new Argi({
					options: {
						port: {
							type: 'number',
							test: val => (val > 0 && val < 65536) || 'Port must be between 1 and 65535',
							description: 'Port number',
						},
					},
				});
			}).not.toThrow(); // Should exit process instead

			expect(exitSpy).toHaveBeenCalledWith(130);
		});
	});

	describe('required options', () => {
		test('should enforce required options', () => {
			process.argv = ['node', 'script.js'];

			expect(() => {
				new Argi({
					options: {
						required: { required: true, description: 'Required option' },
					},
				});
			}).not.toThrow(); // Should exit process instead

			expect(exitSpy).toHaveBeenCalledWith(130);
		});

		test('should pass when required options are provided', () => {
			process.argv = ['node', 'script.js', '--required', 'value'];
			const argi = new Argi({
				options: {
					required: { required: true, description: 'Required option' },
				},
			});

			expect(argi.options.required).toBe('value');
			expect(exitSpy).not.toHaveBeenCalled();
		});
	});

	describe('help and version', () => {
		test('should exit when help flag is provided', () => {
			process.argv = ['node', 'script.js', '--help'];

			expect(() => {
				new Argi({ options: {} });
			}).not.toThrow(); // Should exit process instead

			expect(exitSpy).toHaveBeenCalledWith(130);
		});

		test('should exit when version flag is provided', () => {
			process.argv = ['node', 'script.js', '--version'];

			expect(() => {
				new Argi({ options: {} });
			}).not.toThrow(); // Should exit process instead

			expect(exitSpy).toHaveBeenCalledWith(130);
		});
	});

	describe('transform functions', () => {
		test('should apply custom transform functions', () => {
			process.argv = ['node', 'script.js', '--name', 'john'];
			const argi = new Argi({
				options: {
					name: {
						transform: val => val.toUpperCase(),
						description: 'Name',
					},
				},
			});

			expect(argi.options.name).toBe('JOHN');
		});

		test('should use built-in transform for types', () => {
			process.argv = ['node', 'script.js', '--data', '{"key":"value"}'];
			const argi = new Argi({
				options: {
					data: { type: 'json', description: 'JSON data' },
				},
			});

			expect(argi.options.data).toEqual({ key: 'value' });
		});
	});

	describe('error handling', () => {
		test('should handle undefined arguments', () => {
			process.argv = ['node', 'script.js', 'unknown'];

			expect(() => {
				new Argi({ options: {} });
			}).not.toThrow(); // Should exit process instead

			expect(exitSpy).toHaveBeenCalledWith(130);
		});

		test('should handle missing value for non-boolean flag', () => {
			process.argv = ['node', 'script.js', '--output'];

			expect(() => {
				new Argi({
					options: {
						output: { type: 'string', description: 'Output file' },
					},
				});
			}).not.toThrow(); // Should exit process instead

			expect(exitSpy).toHaveBeenCalledWith(130);
		});

		test('should handle invalid JSON in json type', () => {
			process.argv = ['node', 'script.js', '--data', 'invalid-json'];
			const argi = new Argi({
				options: {
					data: { type: 'json', description: 'JSON data' },
				},
			});

			expect(argi.options.data).toBe('invalid-json'); // Should return original value as fallback
		});

		test('should handle non-numeric input for number type', () => {
			process.argv = ['node', 'script.js', '--count', 'abc'];
			const argi = new Argi({
				options: {
					count: { type: 'number', description: 'Count' },
				},
			});

			expect(argi.options.count).toBeNaN(); // Number('abc') returns NaN
		});
	});

	describe('edge cases', () => {
		test('should handle empty process.argv', () => {
			process.argv = [];
			const argi = new Argi({
				options: {
					optional: { defaultValue: 'default', description: 'Optional' },
				},
			});

			expect(argi.options.optional).toBe('default');
		});

		test('should handle flags with equals sign', () => {
			process.argv = ['node', 'script.js', '--name=John', '--count=42'];
			const argi = new Argi({
				options: {
					name: { type: 'string', description: 'Name' },
					count: { type: 'number', description: 'Count' },
				},
			});

			expect(argi.options.name).toBe('John');
			expect(argi.options.count).toBe(42);
		});

		test('should handle mixed sub commands and flags', () => {
			process.argv = ['node', 'script.js', 'deploy', 'production', '--verbose'];
			const argi = new Argi({
				options: {
					__subCommands: [
						{ name: 'action', description: 'Action' },
						{ name: 'environment', description: 'Environment' },
					],
					verbose: { type: 'boolean', description: 'Verbose' },
				},
			});

			expect(argi.options.action).toBe('deploy');
			expect(argi.options.environment).toBe('production');
			expect(argi.options.verbose).toBe(true);
		});

		test('should handle integer type with valid input', () => {
			process.argv = ['node', 'script.js', '--port', '8080'];
			const argi = new Argi({
				options: {
					port: { type: 'integer', description: 'Port' },
				},
			});

			expect(argi.options.port).toBe(8080);
		});

		test('should handle integer type with invalid input', () => {
			process.argv = ['node', 'script.js', '--port', 'abc'];
			const argi = new Argi({
				options: {
					port: { type: 'integer', description: 'Port' },
				},
			});

			expect(argi.options.port).toBe('abc'); // Should return original as fallback
		});

		test('should handle csv type', () => {
			process.argv = ['node', 'script.js', '--tags', 'red,green,blue'];
			const argi = new Argi({
				options: {
					tags: { type: 'csv', description: 'Tags' },
				},
			});

			expect(argi.options.tags).toEqual(['red', 'green', 'blue']);
		});

		test('should handle boolean flag with explicit true/false values', () => {
			process.argv = ['node', 'script.js', '--debug', 'true', '--verbose', 'false'];
			const argi = new Argi({
				options: {
					debug: { type: 'boolean', description: 'Debug mode' },
					verbose: { type: 'boolean', description: 'Verbose output' },
				},
			});

			expect(argi.options.debug).toBe(true);
			expect(argi.options.verbose).toBe(false);
		});

		test('should handle tail arguments without rest flag', () => {
			process.argv = ['node', 'script.js', 'first', 'second'];
			const argi = new Argi({
				options: {
					__tail: [
						{ name: 'first', description: 'First argument' },
						{ name: 'second', description: 'Second argument' },
					],
				},
			});

			expect(argi.options.first).toBe('first');
			expect(argi.options.second).toBe('second');
		});

		test('should sort flag names correctly', () => {
			const argi = new Argi({ parse: false });
			argi.registerOptions({
				a: { description: 'A' },
				bb: { description: 'BB' },
				c: { description: 'C' },
				dd: { description: 'DD' },
			});

			// Should be sorted by length desc, then alphabetically
			// Includes default help and version flags and their aliases
			expect(argi.flagNames).toContain('bb');
			expect(argi.flagNames).toContain('dd');
			expect(argi.flagNames).toContain('a');
			expect(argi.flagNames).toContain('c');
			expect(argi.flagNames).toContain('help');
			expect(argi.flagNames).toContain('version');
			expect(argi.flagNames).toContain('h'); // help alias
			expect(argi.flagNames).toContain('?'); // help alias

			// Longer flags should come before shorter ones
			const bbIndex = argi.flagNames.indexOf('bb');
			const aIndex = argi.flagNames.indexOf('a');
			expect(bbIndex).toBeLessThan(aIndex);
		});
	});

	describe('usage and help text generation', () => {
		test('should generate proper usage text', () => {
			const argi = new Argi({
				parse: false,
				options: {
					verbose: { type: 'boolean', alias: 'v', description: 'Verbose' },
					output: { type: 'string', alias: 'o', description: 'Output file' },
				},
			});

			const usageText = argi.usageText;
			expect(usageText).toContain('argi'); // package name
			expect(usageText).toContain('--verbose');
			expect(usageText).toContain('--output');
		});

		test('should handle custom usage text', () => {
			const customUsage = 'Custom usage: myapp [options]';
			const argi = new Argi({
				parse: false,
				usageText: customUsage,
			});

			expect(argi.usageText).toBe(customUsage);
		});

		test('should generate version text from package.json', () => {
			const argi = new Argi({ parse: false });
			const versionText = argi.versionText;

			expect(versionText).toContain('0.5.0'); // From package.json
		});

		test('should handle custom version text', () => {
			const customVersion = 'Custom Version 1.0.0';
			const argi = new Argi({
				parse: false,
				versionText: customVersion,
			});

			expect(argi.versionText).toBe(customVersion);
		});
	});
});
