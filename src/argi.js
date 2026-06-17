/* eslint-disable no-console */
import { readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

import { escapeRegex, parseBool, parseInteger, parseCsv, palette, paint, findProjectRoot } from './utils';

const JSON_INVALID = Symbol('jsonInvalid');

/**
 * Reads the nearest package.json by walking up from the entry-point directory.
 * @returns {{name: string, version: string, description: string}} Parsed package.json, or a minimal fallback object
 */
function loadPackageJSON() {
	try {
		const startPath = process.argv[1] ? dirname(resolve(process.argv[1])) : process.cwd();
		return JSON.parse(readFileSync(join(findProjectRoot(startPath), 'package.json'), 'utf8'));
	} catch {
		return { name: basename(process.argv[1] || 'cli'), version: '', description: '' };
	}
}

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
 * @property {object} [defaults] - Override default types, transforms, tests, and built-in flags; set `defaults.config.help` or `defaults.config.version` to `false` to disable them
 * @property {object} [packageJSON] - Package.json object (auto-detected from project root if omitted)
 * @property {object} [options] - Flag definitions
 * @property {object[]} [tail] - Positional slot definitions consumed after flags
 * @property {object} [commands] - Named command map; each entry has description, its own options schema, and optional nested commands
 * @property {boolean} [parse=true] - Parse process.argv on construction
 * @property {string[]} [argv] - Custom args array (no node/script prefix); overrides process.argv when provided
 * @property {boolean} [remaining=false] - When true, collect unparsed args in this.remaining instead of erroring
 */

/**
 * CLI argument parser: named commands, flags, and tail arguments.
 */
class Argi {
	#matched = new Set();
	#customUsageText;
	#customVersionText;
	#config = {};
	#baseConfig = {};
	#builtinKeys = new Set();
	#argv = null;
	#captureRemaining = false;

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
	constructor({ helpText, usageText, versionText, defaults = {}, packageJSON, options, commands, parse = true, tail, argv, remaining }) {
		this.usageText = usageText;
		this.versionText = versionText;
		this.defaults = {
			type: 'string',
			...defaults,
			transform: {
				string: String,
				number: Number,
				boolean: parseBool,
				integer: parseInteger,
				json: value => { try { return JSON.parse(value); } catch { return JSON_INVALID; } },
				csv: parseCsv,
				...defaults.transform,
			},
			test: {
				number: value => !Number.isNaN(value) || 'not a valid number',
				integer: value => typeof value === 'number' || 'not a valid integer',
				json: value => value !== JSON_INVALID || 'not valid JSON',
				...defaults.test,
			},
			config: {
				help: { type: 'boolean', alias: ['h', '?'] },
				version: { type: 'boolean' },
				...defaults.config,
			},
		};
		this.#builtinKeys = new Set(Object.keys(this.defaults.config));
		this.packageJSON = packageJSON || loadPackageJSON();
		this.commands = commands;
		this.helpText = helpText || this.packageJSON.description || '';

		this.tail = tail || null;
		this.#argv = argv || null;
		this.#captureRemaining = !!remaining;
		this.commandPath = [];
		this.#config = { ...this.defaults.config, ...options };
		this.#baseConfig = { ...this.#config };

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
		if (this.#customUsageText !== undefined) return this.#customUsageText;
		let usage = `${paint(' Usage ', palette.background.white, palette.black, palette.bold)}\n\n${
			this.packageJSON.name
		}`;

		if (this.commandPath?.length > 0) {
			this.commandPath.forEach(cmd => (usage += ` ${paint(cmd, palette.magenta)}`));
		} else if (this.commands) {
			usage += ` ${paint('<command>', palette.magenta)}`;
		}

		if (this.#getActiveCommandConfig()?.commands) {
			usage += ` ${paint('<subcommand>', palette.magenta)}`;
		}

		const printedUsage = new Set();

		this.requiredOptions.forEach(flag => {
			usage += ` ${this.#getFlagUsageText(flag)}`;

			printedUsage.add(flag);
		});

		usage += ' [';

		let printed = 0;

		Object.keys(this.#config).forEach(flag => {
			if (printedUsage.has(flag)) return;

			usage += `${printed++ ? ' | ' : ''}${this.#getFlagUsageText(flag)}`;
		});

		usage += ']';

		if (this.tail)
			this.tail.forEach(
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
		this.#customUsageText = value;
	}

	/**
	 * Returns custom version text, or formats the package.json version.
	 * @returns {string} Version text with ANSI styling
	 */
	get versionText() {
		const { version } = this.packageJSON;

		return this.#customVersionText ?? `\n${paint(' Version ', palette.background.white, palette.black, palette.bold)}\n\n${version}\n`;
	}

	/**
	 * Sets custom version text
	 * @param {string} value - Custom version text
	 */
	set versionText(value) {
		this.#customVersionText = value;
	}

	#getFlagUsageText(flag) {
		const { string, type = this.defaults.type, variableName = type, required } = this.#config[flag];

		return (
			`${required ? '' : '['}${paint(string.replaceAll(/,\s/g, '|'), palette.blue)}` +
			(type === 'boolean' ? '' : ` <${paint(variableName, palette.cyan)}>`) +
			(required ? '' : ']')
		);
	}

	#getFlagHelpText(flag) {
		const { type = this.defaults.type, defaultValue, string, variableName = type } = this.#config[flag];
		let { description = '' } = this.#config[flag];

		if (description.length > 0) description = `\t${description}\n`;

		return `${paint(string, palette.blue)}\n\t[${paint(variableName, palette.cyan)}${
			defaultValue === undefined ? '' : ' :: ' + paint(defaultValue, palette.green)
		}]\n${description}`;
	}

	/** Prints version, usage, flags, and tail documentation, then exits with code 0. */
	printHelp() {
		console.log(this.versionText);

		const activeConfig = this.#getActiveCommandConfig();
		const activeDescription = activeConfig?.description ?? this.helpText;

		if (activeDescription) console.log(activeDescription, '\n');

		console.log(this.usageText);

		if (this.commands && !this.command) {
			console.log(`\n${paint(' Commands ', palette.background.white, palette.black, palette.bold)}\n`);

			Object.entries(this.commands).forEach(([name, { description = '' }]) => {
				if (description?.length > 0) description = `\n\t${description}`;

				console.log(`${name.toUpperCase()}\n\t[${paint(name, palette.magenta)}]${description}\n`);
			});
		}

		if (activeConfig?.commands) {
			console.log(`\n${paint(' Sub-commands ', palette.background.white, palette.black, palette.bold)}\n`);

			Object.entries(activeConfig.commands).forEach(([name, { description = '' }]) => {
				if (description?.length > 0) description = `\n\t${description}`;

				console.log(`${name.toUpperCase()}\n\t[${paint(name, palette.magenta)}]${description}\n`);
			});
		}

		if (this.tail) {
			console.log(`\n${paint(' Tailing Arguments ', palette.background.white, palette.black, palette.bold)}\n`);

			this.tail.forEach(({ description = '', name, variableName }) => {
				if (description?.length > 0) description = `\n\t${description}`;

				console.log(`${name.toUpperCase()}\n\t[${paint(variableName || name, palette.magenta)}]${description}\n`);
			});
		}

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

		Object.keys(this.#config).forEach(flag => {
			if (printedHelp.has(flag)) return;

			console.log(this.#getFlagHelpText(flag));
		});

		exit(0);
	}

	/**
	 * Clones and normalizes option definitions, building alias maps and flag display strings.
	 * @param {object} [options] - Flag and tail argument definitions
	 */
	registerOptions(options = {}) {
		this.#config = { ...this.#config };
		this.#matched = new Set();

		for (const [key, value] of Object.entries(options)) {
			if (value && typeof value === 'object') this.#config[key] = { ...value };
			else this.#config[key] = value;
		}

		this.optionNames = Object.keys(this.#config);
		this.flagNames = [];
		this.requiredOptions = [];
		this.aliasMap = {};

		const registerAlias = (alias, flag) => {
			this.flagNames.push(alias);

			this.aliasMap[alias] = flag;
		};

		this.optionNames.forEach(flag => {
			if (!this.#config[flag]) return;

			const { alias, required } = this.#config[flag];

			if (required) this.requiredOptions.push(flag);

			this.flagNames.push(flag);

			if (!this.#config[flag].string) {
				this.#config[flag].alias = [flag].concat(alias || []);
				this.#config[flag].string = this.#config[flag].alias
					.map(alias => `${alias.length > 1 ? '--' : '-'}${alias}`)
					.join(', ');
			}

			if (typeof alias === 'string') registerAlias(alias, flag);
			else if (Array.isArray(alias)) alias.forEach(alias => registerAlias(alias, flag));
		});

		// Longer names sorted first — prevents a shorter prefix from matching before its longer counterpart (e.g. --verb before --verbose)
		this.flagNames = this.flagNames.sort((a, b) => b.length - a.length || a.localeCompare(b));

		this.config = Object.fromEntries(Object.entries(this.#config).filter(([k]) => !this.#builtinKeys.has(k)));
	}

	/** Splits argv on `--`, storing everything after it in this.passThrough. */
	#parsePassThrough() {
		this.argArray = this.#argv ? [...this.#argv] : Array.from(process.argv).slice(2);

		const passThroughSplit = this.argArray.indexOf('--');

		if (passThroughSplit < 0) return;

		this.passThrough = this.argArray.slice(passThroughSplit + 1, this.argArray.length);
		this.argArray = this.argArray.slice(0, passThroughSplit);
	}

	/** Walks argv consuming command words as deep as declared command trees allow. Populates commandPath and command. */
	#parseCommand() {
		if (!this.commands) return;

		let cursor = this.commands;

		while (true) {
			const arg = this.argArray[0];

			if (!arg || arg[0] === '-') break;

			if (!cursor[arg]) {
				const label = this.commandPath.length === 0 ? 'command' : 'sub-command';

				console.error(
					`${paint('Error:', palette.red)} Unknown ${label} "${arg}"\n${paint(`Available ${label}s:`, palette.cyan)} ${Object.keys(cursor).join(', ')}\n`,
				);

				exit();

				return;
			}

			this.commandPath.push(arg);
			this.argArray.shift();

			cursor = cursor[arg].commands;

			if (!cursor) break;
		}

		this.command = this.commandPath[0];
	}

	/** Returns the CommandConfig at the deepest matched command in commandPath. */
	#getActiveCommandConfig() {
		let cursor = this.commands;
		let config = null;

		for (const cmd of this.commandPath) {
			config = cursor?.[cmd];
			cursor = config?.commands;
		}

		return config;
	}

	/** Merges options from every level in a command path into a flat object. */
	#optionsForPath(path) {
		const merged = {};
		let cursor = this.commands;

		for (const cmd of path) {
			Object.assign(merged, cursor[cmd]?.options || {});
			cursor = cursor[cmd]?.commands;
			if (!cursor) break;
		}

		return merged;
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
			} = this.#config[optionName];

			const longFlag = flagName.length > 1;
			const newArguments = [];
			// Boolean long: ^--((no-?)?(name).*) — group 1: full post-'--' content, group 2: optional 'no-' prefix, group 3: name
			// Other long:   ^--((name).*)        — group 1: name + trailing (e.g. 'port=8080'), group 2: name
			// Short:        ^-([^-=]*(name).*)   — group 1: all chars after '-', group 2: flag char
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

				const isBooleanLong = type === 'boolean' && longFlag;
				// Boolean long: strip group 1 (full post-'--' content) — boolean flags carry no value, result is always empty
				// Everything else: strip group 2 (the flag name) — leaves inline value or chained chars as the result
				const toStrip = isBooleanLong ? flagMatch[1] : flagMatch[2];
				const remainder = flagMatch[1].replace(toStrip, '').replace(/^=/, '');

				// undefined sentinel: distinct from defaultValue so --flag with defaultValue:false still sets true
				let value;

				if (remainder) {
					if (type === 'boolean' && !longFlag) newArguments.push(`-${remainder}`);
					else value = remainder;
				} else {
					const nextArgument = this.argArray[x + 1];

					if (
						nextArgument &&
						nextArgument[0] !== '-' &&
						(type !== 'boolean' || /^(true|false|1|0)$/i.test(nextArgument))
					) {
						++x;

						value = type === 'boolean' ? parseBool(nextArgument) : nextArgument;
					} else if (type !== 'boolean') {
						const flagDisplay = `${flagName.length > 1 ? '--' : '-'}${flagName}`;

						console.error(
							`${paint('Error:', palette.red)} Missing value for flag ${flagDisplay}\n${paint(
								'Expected:',
								palette.cyan,
							)} ${flagDisplay} <${variableName}>\n${paint('Example:', palette.green)} ${
								this.packageJSON.name
							} ${flagDisplay} "your-value"\n`,
						);

						exit();
					}
				}

				// For boolean long, group 2 captures the optional 'no-?' prefix — its presence negates the flag
				const negated = isBooleanLong && flagMatch[2]?.startsWith('no');

				if (type === 'boolean' && value === undefined)
					this.options[optionName] = negated ? false : true;
				else this.options[optionName] = transform(value ?? defaultValue);

				if (test) this.#testOption(optionName, this.options[optionName], test);
			}

			this.argArray = newArguments;
		});
	}

	/** Consumes positional arguments after flags. Supports rest-mode (capture all remaining). */
	#parseTailArgs() {
		if (!this.tail || !this.argArray[0]) return;

		const snapshot = Array.from(this.argArray);

		for (let index = 0; index < snapshot.length; index++) {
			const raw = snapshot[index];

			if (raw[0] === '-') break;

			if (!this.tail[index]) {
				console.error(
					`${paint('Error:', palette.red)} Unknown tail argument "${raw}"\n${paint(
						'Available tail arguments:',
						palette.cyan,
					)} ${this.tail.map(t => t.name).join(', ')}\n${paint('Usage:', palette.green)} ${
						this.packageJSON.name
					} [options] ${this.tail.map(t => `<${t.name}>`).join(' ')}\n`,
				);

				exit();
				break;
			}

			const {
				rest,
				name,
				type = this.defaults.type,
				test = this.defaults.test[type],
				transform = this.defaults.transform[type],
			} = this.tail[index];

			let value;

			if (rest) {
				value = snapshot.slice(index).map(transform);
				this.argArray.length = 0;
			} else {
				this.argArray.shift();
				value = transform(raw);
			}

			if (test) this.#testOption(name, value, test);

			this.options[name] = value;

			if (rest) break;
		}
	}

	/**
	 * Runs a validation function against a parsed value. Exits with error on failure.
	 * @param {string} name - Option name (for error messages)
	 * @param {*} value - The parsed value to check
	 * @param {Function} test - Validation function: returns true or an error string
	 */
	#testOption(name, value, test) {
		const testResults = test(value);

		if (testResults && typeof testResults === 'boolean') return;

		console.error(testResults || `"${name}" failed validation`);

		exit();
	}

	/** Checks that all required flags and tail args have values. Exits on missing. */
	#enforceRequired() {
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

		if (this.tail) {
			this.tail.forEach(({ required, name, variableName }) => {
				if (!required || this.options[name] !== undefined) return;

				console.error(
					`${paint('Error:', palette.red)} Missing required tail argument "${variableName || name}"\n${paint(
						'Usage:',
						palette.cyan,
					)} ${this.packageJSON.name} ${this.tail.map(({ name: n, variableName: varName }) => `<${varName || n}>`).join(' ')}\n${paint('Help:', palette.green)} ${
						this.packageJSON.name
					} --help\n`,
				);

				exit();
			});
		}
	}

	/** Sets defaultValue on any flag not matched during parsing. */
	#applyDefaultValues() {
		this.optionNames.forEach(flag => {
			const { defaultValue } = this.#config[flag];

			if (this.#matched.has(flag) || defaultValue === undefined) return;

			this.options[flag] = defaultValue;
		});
	}

	/**
	 * Outputs one completion candidate per line given the current command-line tokens.
	 * Triggered automatically when --_completions appears in argv.
	 * @param {string[]} words - All tokens the user has typed (including the CLI name as words[0])
	 * @param {string[]} activePath - Matched command path so far
	 * @param {object|null} nextCommands - Sub-commands available at the current depth, or null
	 * @private
	 */
	#outputCompletions(words, activePath, nextCommands) {
		const args = words[0] === this.packageJSON.name ? words.slice(1) : words;
		const prev = args[args.length - 2] ?? '';

		// If the previous token is a non-boolean flag, we're completing its value — output nothing
		if (prev.startsWith('-')) {
			const flagName = prev.replace(/^-+/, '');
			const optionName = this.aliasMap?.[flagName] || flagName;
			const flagConf = this.#config[optionName];

			if (flagConf && flagConf.type !== 'boolean') {
				console.log('');

				return;
			}
		}

		const candidates = [];

		if (this.commands && !activePath.length) candidates.push(...Object.keys(this.commands));

		if (nextCommands) candidates.push(...Object.keys(nextCommands));

		// All flags — options from every active level are already merged into this.#config
		for (const [, val] of Object.entries(this.#config)) {
			if (!val?.alias) continue;

			for (const alias of val.alias) candidates.push(alias.length > 1 ? `--${alias}` : `-${alias}`);
		}

		console.log([...new Set(candidates)].join('\n'));
	}

	/**
	 * Outputs a shell completion setup script for bash, zsh, or fish, then exits with code 0.
	 * Wire this up to a flag or command in your CLI; the --_completions query protocol is always active.
	 * @param {string} shell - Target shell: 'bash', 'zsh', or 'fish'
	 * @param {string} [name] - CLI executable name (defaults to package.json name)
	 * @example
	 * // User runs: eval "$(mycli --completions bash)"
	 * if (argi.options.completions) argi.printCompletions(argi.options.completions);
	 */
	printCompletions(shell, name = this.packageJSON.name) {
		const fn = name.replaceAll(/[^a-zA-Z0-9]/g, '_');

		const scripts = {
			bash: [
				`_${fn}_completions() {`,
				`  local cur="\${COMP_WORDS[COMP_CWORD]}"`,
				`  COMPREPLY=($(compgen -W "$(${name} --_completions "\${COMP_WORDS[@]}" 2>/dev/null)" -- "$cur"))`,
				`}`,
				`complete -F _${fn}_completions ${name}`,
			].join('\n'),
			zsh: [
				`#compdef ${name}`,
				`_${fn}_completions() {`,
				`  local -a completions`,
				`  completions=("\${(@f)$(${name} --_completions "\${words[@]}" 2>/dev/null)}")`,
				`  compadd -a completions`,
				`}`,
				`_${fn}_completions "$@"`,
			].join('\n'),
			fish: [
				`function __${fn}_completions`,
				`  ${name} --_completions (commandline -opc) 2>/dev/null`,
				`end`,
				`complete -c ${name} -f -a '(__${fn}_completions)'`,
			].join('\n'),
		};

		if (!scripts[shell]) {
			console.error(
				`${paint('Error:', palette.red)} Unknown shell "${shell}"\n${paint('Supported:', palette.cyan)} bash, zsh, fish\n`,
			);

			exit();

			return;
		}

		console.log(scripts[shell]);

		exit(0);
	}

	/**
	 * Runs the full parse pipeline: pass-through split, command detection, flags, tail args,
	 * required enforcement, and defaults. Results populate this.options.
	 * @param {object} [options] - Option definitions (registers if provided)
	 * @returns {Argi} This instance, for chaining
	 * @throws {ArgiExit} On help/version (code 0) or validation errors (code 1)
	 */
	parse(options) {
		this.options = {};
		this.command = undefined;
		this.commandPath = [];
		this.#config = { ...this.#baseConfig };

		this.#parsePassThrough();

		const completionsIndex = this.argArray.indexOf('--_completions');

		if (completionsIndex !== -1) {
			const words = this.argArray.slice(completionsIndex + 1);
			const args = words[0] === this.packageJSON.name ? words.slice(1) : words;

			// Walk the token list as deep as declared commands allow.
			// Use findIndex to skip past any non-command prefix tokens (e.g. the CLI name).
			const activePath = [];
			let cursor = this.commands || null;
			const cmdStart = cursor ? args.findIndex(t => !t.startsWith('-') && cursor[t]) : -1;

			if (cmdStart !== -1) {
				for (let i = cmdStart; i < args.length; i++) {
					const token = args[i];

					if (token.startsWith('-') || !cursor?.[token]) break;

					activePath.push(token);
					cursor = cursor[token].commands || null;
				}
			}

			this.registerOptions({ ...(options || {}), ...this.#optionsForPath(activePath) });
			this.#outputCompletions(words, activePath, cursor);
			exit(0);
		}

		this.#parseCommand();
		this.registerOptions({ ...(options || {}), ...this.#optionsForPath(this.commandPath) });
		this.#parseFlags();

		if (this.defaults.config.help && this.#config.help === this.defaults.config.help && this.options.help) this.printHelp();

		if (this.defaults.config.version && this.#config.version === this.defaults.config.version && this.options.version) {
			console.log(this.versionText);

			exit(0);
		}

		this.#parseTailArgs();
		this.#enforceRequired();
		this.#applyDefaultValues();

		if (this.#captureRemaining) {
			this.remaining = [...this.argArray];
		} else if (this.argArray.length > 0) {
			console.error(`${paint('Error:', palette.red)} Unknown arguments: ${this.argArray.join(', ')}`);

			exit();
		}

		return this;
	}
}

export default Argi;
