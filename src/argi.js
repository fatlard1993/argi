/* eslint-disable no-console */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { escapeRegex, parseBool, parseInteger, parseCsv, parseJson, palette, paint, findProjectRoot } from './utils';

const RESERVED_KEYS = new Set(['__subCommands', '__tail']);

/**
 * Signals an exit condition (help, version, or validation error).
 * The constructor catches this and calls process.exit(code).
 * Manual parse() callers catch it directly for custom error handling.
 * @property {number} code - Exit code: 0 for help/version, 1 for errors
 */
export class ArgiExit {
	constructor(code = 1) {
		this.code = code;
	}
}

const exit = (code = 1) => {
	throw new ArgiExit(code);
};

/**
 * @typedef {object} OptionConfig
 * @property {string} [type='string'] - Argument type: string, number, boolean, integer, json, csv
 * @property {Function} [transform] - Transform function for parsed value
 * @property {string} [description] - Help text description
 * @property {boolean} [required=false] - Whether the option must exist
 * @property {Function} [test] - Validation function
 * @property {string|string[]} [alias] - Alternative flag names
 * @property {*} [defaultValue] - Default value if not provided
 */

/**
 * @typedef {object} ArgiConfig
 * @property {string} [helpText] - Header text shown above usage in help output
 * @property {string} [usageText] - Custom usage line (auto-generated if omitted)
 * @property {string} [versionText] - Custom version display (uses package.json version if omitted)
 * @property {object} [defaults] - Override default types, transforms, tests, and built-in flags
 * @property {object} [packageJSON] - Package.json object (auto-detected from project root if omitted)
 * @property {object} [options] - Argument definitions: flags, __subCommands, and __tail
 * @property {boolean} [parse=true] - Parse process.argv on construction
 */

/**
 * Three-tier CLI argument parser: sub commands, flags, and tail arguments.
 */
class Argi {
	#matched = new Set();

	/**
	 * @param {ArgiConfig} config - Parser configuration
	 * @example
	 * const cli = new Argi({
	 *   helpText: 'My CLI tool',
	 *   options: {
	 *     output: { type: 'string', description: 'Output file path', required: true }
	 *   }
	 * });
	 */
	constructor({ helpText, usageText, versionText, defaults = {}, packageJSON, options, parse = true }) {
		this.usageText = usageText;
		this._versionText = versionText || '';
		this.defaults = {
			type: 'string',
			...defaults,
			transform: {
				string: String,
				number: Number,
				boolean: parseBool,
				integer: parseInteger,
				json: parseJson,
				csv: parseCsv,
				...defaults.transform,
			},
			test: {
				number: value => !Number.isNaN(value),
				integer: value => typeof value === 'number' || 'not a valid integer',
				...defaults.test,
			},
			config: {
				help: { type: 'boolean', alias: ['h', '?'] },
				version: { type: 'boolean' },
				...defaults.config,
			},
		};
		this.packageJSON =
			packageJSON || JSON.parse(readFileSync(join(findProjectRoot(process.cwd()), 'package.json'), 'utf8'));
		this.helpText = helpText || this.packageJSON.description || '';
		this.config = { ...this.defaults.config, ...options };

		try {
			if (parse) this.parse(options);
			else this.registerOptions(options);
		} catch (error) {
			if (error instanceof ArgiExit) {
				process.exit(error.code);

				return;
			}

			throw error;
		}
	}

	/**
	 * Builds the usage line from registered options, or returns custom text if set.
	 * @returns {string} Formatted usage text with ANSI styling
	 */
	get usageText() {
		if (this._usageText !== undefined) return this._usageText;
		let usage = `${paint(' Usage ', palette.background.white, palette.black, palette.bold)}\n\n${
			this.packageJSON.name
		}`;

		if (this.config.__subCommands) {
			this.config.__subCommands.forEach(
				({ name, variableName }) => (usage += ` [${paint(variableName || name, palette.magenta)}]`),
			);
		}

		const printedUsage = new Set();

		this.requiredOptions.forEach(flag => {
			usage += ` ${this.#getFlagUsageText(flag)}`;

			printedUsage.add(flag);
		});

		usage += ' [';

		let printed = 0;

		Object.keys(this.config).forEach(flag => {
			if (RESERVED_KEYS.has(flag) || printedUsage.has(flag)) return;

			usage += `${printed++ ? ' | ' : ''}${this.#getFlagUsageText(flag)}`;
		});

		usage += ']';

		if (this.config.__tail)
			this.config.__tail.forEach(
				({ name, variableName }) => (usage += ` [${paint(variableName || name, palette.magenta)}]`),
			);

		usage += '\n';

		return usage;
	}

	/**
	 * Sets custom usage text
	 * @param {string} value - Custom usage text
	 */
	set usageText(value) {
		this._usageText = value;
	}

	/**
	 * Returns custom version text, or formats the package.json version.
	 * @returns {string} Version text with ANSI styling
	 */
	get versionText() {
		const { version } = this.packageJSON;

		return (
			this._versionText ||
			`\n${paint(' Version ', palette.background.white, palette.black, palette.bold)}\n\n${version}\n`
		);
	}

	/**
	 * Sets custom version text
	 * @param {string} value - Custom version text
	 */
	set versionText(value) {
		this._versionText = value;
	}

	#getFlagUsageText(flag) {
		const { string, type = this.defaults.type, variableName = type, required } = this.config[flag];

		return (
			`${required ? '' : '['}${paint(string.replaceAll(/,\s/g, '|'), palette.blue)}` +
			(type === 'boolean' ? '' : ` <${paint(variableName, palette.cyan)}>`) +
			(required ? '' : ']')
		);
	}

	#getFlagHelpText(flag) {
		const { type = this.defaults.type, defaultValue, string, variableName = type } = this.config[flag];
		let { description = '' } = this.config[flag];

		if (description.length > 0) description = `\t${description}\n`;

		return `${paint(string, palette.blue)}\n\t[${paint(variableName, palette.cyan)}${
			defaultValue === undefined ? '' : ' :: ' + paint(defaultValue, palette.green)
		}]\n${description}`;
	}

	/** Prints version, usage, and all flag/subcommand/tail documentation, then exits with code 0. */
	printHelp() {
		console.log(this.versionText);

		if (this.helpText) console.log(this.helpText, '\n');

		console.log(this.usageText);

		['subCommands', 'tail'].forEach(position => {
			if (!this.config[`__${position}`]) return;

			console.log(
				`\n${paint(
					position === 'tail' ? ' Tailing Arguments ' : ' Sub Commands ',
					palette.background.white,
					palette.black,
					palette.bold,
				)}\n`,
			);

			this.config[`__${position}`].forEach(({ description = '', name, variableName }) => {
				if (description?.length > 0) description = `\n\t${description}`;

				console.log(`${name.toUpperCase()}\n\t[${paint(variableName || name, palette.magenta)}]${description}\n`);
			});
		});

		const printedHelp = new Set();

		if (this.requiredOptions.length > 0) {
			console.log(`\n${paint(' Required Flags ', palette.background.white, palette.black, palette.bold)}\n`);

			this.requiredOptions.forEach(flag => {
				console.log(this.#getFlagHelpText(flag));

				printedHelp.add(flag);
			});
		}

		console.log(
			`\n${paint(
				`${this.requiredOptions.length > 0 ? ' Optional ' : ''} Flags `,
				palette.background.white,
				palette.black,
				palette.bold,
			)}\n`,
		);

		Object.keys(this.config).forEach(flag => {
			if (RESERVED_KEYS.has(flag) || printedHelp.has(flag)) return;

			console.log(this.#getFlagHelpText(flag));
		});

		exit(0);
	}

	/**
	 * Clones and normalizes option definitions, building alias maps and flag display strings.
	 * @param {object} [options] - Flag, subcommand, and tail argument definitions
	 */
	registerOptions(options = {}) {
		this.config = { ...this.config };
		this.#matched = new Set();

		for (const [key, value] of Object.entries(options)) {
			if (Array.isArray(value)) this.config[key] = value.map(v => ({ ...v }));
			else if (value && typeof value === 'object') this.config[key] = { ...value };
			else this.config[key] = value;
		}

		this.optionNames = Object.keys(this.config);
		this.flagNames = [];
		this.requiredOptions = [];
		this.aliasMap = {};

		const registerAlias = (alias, flag) => {
			this.flagNames.push(alias);

			this.aliasMap[alias] = flag;
		};

		this.optionNames.forEach(flag => {
			if (RESERVED_KEYS.has(flag) || !this.config[flag]) return;

			const { alias, required } = this.config[flag];

			if (required) this.requiredOptions.push(flag);

			this.flagNames.push(flag);

			if (!this.config[flag].string) {
				this.config[flag].alias = [flag].concat(alias || []);
				this.config[flag].string = this.config[flag].alias
					.map(alias => `${alias.length > 1 ? '--' : '-'}${alias}`)
					.join(', ');
			}

			if (typeof alias === 'string') registerAlias(alias, flag);
			else if (Array.isArray(alias)) alias.forEach(alias => registerAlias(alias, flag));
		});

		this.flagNames = this.flagNames.sort((a, b) => b.length - a.length || a.localeCompare(b));
	}

	/** Splits argv on `--`, storing the remainder in this.passThrough. */
	#parsePassThrough() {
		this.argArray = Array.from(process.argv).slice(2);

		const passThroughSplit = this.argArray.indexOf('--');

		if (passThroughSplit < 0) return;

		this.passThrough = this.argArray.slice(passThroughSplit + 1, this.argArray.length);
		this.argArray = this.argArray.slice(0, passThroughSplit);
	}

	/**
	 * Parses positional sub-command arguments from the front of the argument array.
	 * Stops at the first flag (-prefixed argument) or when sub-command definitions run out.
	 * @private
	 */
	#parseSubCommands() {
		if (!this.config.__subCommands || !this.argArray[0] || this.argArray[0][0] === '-') return;

		let parsedSubCommands;

		Array.from(this.argArray).forEach((argument, index) => {
			if (parsedSubCommands || argument[0] === '-' || !this.config.__subCommands[index]) {
				parsedSubCommands = true;

				return;
			}

			const {
				name,
				type = this.defaults.type,
				test = this.defaults.test[type],
				transform = this.defaults.transform[type],
			} = this.config.__subCommands[index];

			argument = transform(argument);

			if (test) this.#testOption(name, argument, test);

			this.argArray.shift();

			this.options[name] = argument;
		});
	}

	/**
	 * Parses flag arguments from the argument array.
	 *
	 * Handles short (-f) and long (--flag) formats, --no-prefix negation,
	 * value assignment (--flag=value or --flag value), chained short flags (-abc),
	 * alias resolution, type coercion, and validation.
	 * @private
	 */
	#parseFlags() {
		this.flagNames.forEach(flagName => {
			const optionName = this.aliasMap[flagName] || flagName;

			if (this.#matched.has(optionName) || !this.argArray?.length) return;

			const {
				type = this.defaults.type,
				transform = this.defaults.transform[type],
				variableName = type,
				test = this.defaults.test[type],
				defaultValue,
			} = this.config[optionName];

			const longFlag = flagName.length > 1;
			const newArguments = [];
			const flagRegex = longFlag
				? new RegExp(`^--(${type === 'boolean' ? '(no-?)?' : ''}(${escapeRegex(flagName)}).*)`)
				: new RegExp(`^-([^-=]*(${escapeRegex(flagName)}).*)`);

			for (let x = 0, count = this.argArray.length, argument, flagMatch; x < count; ++x) {
				argument = this.argArray[x];

				if (!argument) continue;

				if (argument[0] !== '-') {
					newArguments.push(argument);
					continue;
				}

				flagMatch = flagRegex.exec(argument);

				if (!flagMatch) {
					newArguments.push(argument);
					continue;
				}

				if (!longFlag) {
					const otherChars = flagMatch[1].replace(flagName, '').replace(/=.*$/, '');

					if (otherChars && !otherChars.split('').every(c => this.flagNames.includes(c))) {
						newArguments.push(argument);
						continue;
					}
				}

				this.#matched.add(optionName);

				const splitArgument = [
					flagMatch[type === 'boolean' && longFlag ? 1 : 2],
					type === 'boolean' && /no-?/.test(flagMatch[2]) ? '' : flagMatch[1].replace(flagMatch[2], ''),
				];
				const remainder = flagMatch[1].replace(splitArgument[0], '').replace(/^=/, '');

				let value = defaultValue;

				if (remainder) {
					if (type === 'boolean' && !longFlag) newArguments.push(`-${remainder}`);
					else value = remainder;
				} else {
					const nextArgument = this.argArray[x + 1];

					if (
						nextArgument &&
						nextArgument[0] !== '-' &&
						(type !== 'boolean' || parseBool(nextArgument, undefined) !== undefined)
					) {
						++x;

						value = type === 'boolean' ? parseBool(nextArgument, undefined) : nextArgument;
					} else if (type !== 'boolean') {
						console.log(
							`${paint('Error:', palette.red)} Missing value for flag --${flagName}\n${paint(
								'Expected:',
								palette.cyan,
							)} --${flagName} <${variableName}>\n${paint('Example:', palette.green)} ${
								this.packageJSON.name
							} --${flagName} "your-value"\n`,
						);

						exit();
					}
				}

				if (type === 'boolean' && value === undefined)
					this.options[optionName] = flagMatch[2] && flagMatch[2].startsWith('no') ? false : true;
				else this.options[optionName] = transform(value);

				if (test) this.#testOption(optionName, this.options[optionName], test);
			}

			this.argArray = newArguments;
		});
	}

	/** Consumes positional arguments after flags. Supports rest-mode (capture all remaining). */
	#parseTailArgs() {
		if (!this.config.__tail || !this.argArray[0]) return;

		let parsedTailArguments;

		Array.from(this.argArray).forEach((argument, index, argumentArray) => {
			if (parsedTailArguments || argument[0] === '-') {
				parsedTailArguments = true;
				return;
			}

			if (!this.config.__tail[index]) {
				console.error(
					`${paint('Error:', palette.red)} Unknown tail argument "${argument}"\n${paint(
						'Available tail arguments:',
						palette.cyan,
					)} ${this.config.__tail.map(t => t.name).join(', ')}\n${paint('Usage:', palette.green)} ${
						this.packageJSON.name
					} [options] ${this.config.__tail.map(t => `<${t.name}>`).join(' ')}\n`,
				);

				exit();
			}

			const {
				rest,
				name,
				type = this.defaults.type,
				test = this.defaults.test[type],
				transform = this.defaults.transform[type],
			} = this.config.__tail[index];

			if (rest) {
				argument = argumentArray.slice(index).map(transform);

				this.argArray.length = 0;

				parsedTailArguments = true;
			} else {
				this.argArray.shift();

				argument = transform(argument);
			}

			if (test) this.#testOption(name, argument, test);

			this.options[name] = argument;
		});
	}

	/**
	 * Runs a validation function against a parsed value. Exits with error on failure.
	 * @param {string} name - Option name (for error messages)
	 * @param {*} value - Parsed value to validate
	 * @param {Function} test - Validation function: returns true or an error string
	 */
	#testOption(name, value, test) {
		const testResults = test(value);

		if (testResults && typeof testResults === 'boolean') return;

		console.log(testResults || `"${name}" failed validation`);

		exit();
	}

	/** Checks that all required subcommands, flags, and tail args have values. Exits on missing. */
	#enforceRequired() {
		if (this.config.__subCommands) {
			this.config.__subCommands.forEach(command => {
				if (command.required && this.options[command.name] === undefined) {
					console.error(
						`Missing required sub command(s): ${this.packageJSON.name}${this.config.__subCommands
							.flatMap(({ required, name, variableName }) => {
								return required && this.options[name] === undefined
									? [` [${name}${variableName ? `: ${variableName}` : ''}]`]
									: [];
							})
							.join('')}\n`,
					);

					exit();
				}
			});
		}

		if (this.requiredOptions) {
			this.requiredOptions.forEach(option => {
				if (this.options[option] === undefined) {
					console.error(
						`${paint('Error:', palette.red)} Required option "${option}" is missing\n${paint(
							'Usage:',
							palette.cyan,
						)} ${this.packageJSON.name} --${option} <value>\n${paint('Help:', palette.green)} ${
							this.packageJSON.name
						} --help\n`,
					);

					exit();
				}
			});
		}

		if (this.config.__tail) {
			this.config.__tail.forEach(command => {
				if (command.required && this.options[command.name] === undefined) {
					console.error(
						`Missing required tailing arguments(s): ${this.packageJSON.name}${this.config.__tail
							.flatMap(({ required, name, variableName }) => {
								return required && this.options[name] === undefined
									? [` [${name}${variableName ? `: ${variableName}` : ''}]`]
									: [];
							})
							.join('')}\n`,
					);

					exit();
				}
			});
		}
	}

	/** Sets defaultValue on any flag not matched during parsing. */
	#applyDefaultValues() {
		this.optionNames.forEach(flag => {
			const { defaultValue } = this.config[flag];

			if (this.#matched.has(flag) || defaultValue === undefined) return;

			this.options[flag] = defaultValue;
		});
	}

	/**
	 * Runs the full parse pipeline: pass-through split, subcommands, flags, tail args,
	 * required enforcement, and defaults. Results populate this.options.
	 * @param {object} [options] - Option definitions (registers if provided)
	 * @returns {Argi} This instance, for chaining
	 * @throws {ArgiExit} On help/version (code 0) or validation errors (code 1)
	 */
	parse(options) {
		this.options = {};

		if (options) this.registerOptions(options);

		this.#parsePassThrough();
		this.#parseSubCommands();
		this.#parseFlags();

		if (this.defaults.config.help && this.options.help) this.printHelp();

		if (this.defaults.config.version && this.options.version) {
			console.log(this.versionText);

			exit(0);
		}

		this.#parseTailArgs();
		this.#enforceRequired();
		this.#applyDefaultValues();

		if (this.argArray.length > 0) {
			console.error(`${paint('Error:', palette.red)} Unknown arguments: ${this.argArray.join(', ')}`);

			exit();
		}

		return this;
	}
}

export default Argi;
