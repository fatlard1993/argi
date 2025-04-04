import findRoot from 'find-root';

import { escapeRegex, parseBool, parseInteger, parseCsv, parseJson, pallette, paint } from './utils';

const exit = () => process.exit(130);

class Argi {
	constructor({ helpText, usageText, versionText, defaults = {}, packageJSON, options, parse = true }) {
		this.helpText = helpText || '';
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
				...defaults.test,
			},
			config: {
				help: { type: 'boolean', alias: ['h', '?'] },
				version: { type: 'boolean' },
				...defaults.config,
			},
		};
		this.packageJSON = packageJSON || require(`${findRoot(process.cwd())}/package.json`);
		this.config = { ...this.defaults.config, ...options };

		this[parse ? 'parse' : 'registerOptions'](options);
	}

	get usageText() {
		if (this._usageText !== undefined) return this._usageText;
		let usage = `${paint(' Usage ', pallette.background.white, pallette.black, pallette.bold)}\n\n${
			this.packageJSON.name
		}`;

		if (this.config.__subCommands) {
			this.config.__subCommands.forEach(
				({ name, variableName }) => (usage += ` [${paint(variableName || name, pallette.magenta)}]`),
			);
		}

		this.requiredOptions.forEach(flag => {
			usage += ` ${this.#getFlagUsageText(flag)}`;

			this.config[flag].printedUsage = true;
		});

		usage += ' [';

		Object.keys(this.config).forEach((flag, index) => {
			if ({ __subCommands: true, __tail: true }[flag] || this.config[flag].printedUsage) return;

			usage += `${index ? ' | ' : ''}${this.#getFlagUsageText(flag)}`;
		});

		usage += ']';

		if (this.config.__tail)
			this.config.__tail.forEach(
				({ name, variableName }) => (usage += ` [${paint(variableName || name, pallette.magenta)}]`),
			);

		usage += '\n';

		return usage;
	}

	set usageText(value) {
		this._usageText = value;
	}

	get versionText() {
		const { version } = this.packageJSON;

		return (
			this._versionText ||
			`\n${paint(' Version ', pallette.background.white, pallette.black, pallette.bold)}\n\n${version}\n`
		);
	}

	set versionText(value) {
		this._versionText = value;
	}

	#getFlagUsageText(flag) {
		const { string, type = this.defaults.type, variableName = type, required } = this.config[flag];

		return (
			`${required ? '' : '['}${paint(string.replaceAll(/,\s/g, '|'), pallette.blue)}` +
			(type === 'boolean' ? '' : ` <${paint(variableName, pallette.cyan)}>`) +
			(required ? '' : ']')
		);
	}

	#getFlagHelpText(flag) {
		const { type = this.defaults.type, defaultValue, string, variableName = type } = this.config[flag];
		let { description = '' } = this.config[flag];

		if (description.length > 0) description = `\t${description}\n`;

		return `${paint(string, pallette.blue)}\n\t[${paint(variableName, pallette.cyan)}${
			defaultValue === undefined ? '' : ' :: ' + paint(defaultValue, pallette.green)
		}]\n${description}`;
	}

	printHelp() {
		console.log(this.versionText);

		if (!!this.helpText) console.log(this.helpText, '\n');

		console.log(this.usageText);

		['subCommands', 'tail'].forEach(position => {
			if (!this.config[`__${position}`]) return;

			console.log(
				`\n${paint(
					position === 'tail' ? ' Tailing Arguments ' : ' Sub Commands ',
					pallette.background.white,
					pallette.black,
					pallette.bold,
				)}\n`,
			);

			this.config[`__${position}`].forEach(({ description = '', name, variableName }) => {
				if (description?.length > 0) description = `\n\t${description}`;

				console.log(`${name.toUpperCase()}\n\t[${paint(variableName || name, pallette.magenta)}]${description}\n`);
			});
		});

		if (this.requiredOptions.length > 0) {
			console.log(`\n${paint(' Required Flags ', pallette.background.white, pallette.black, pallette.bold)}\n`);

			this.requiredOptions.forEach(flag => {
				console.log(this.#getFlagHelpText(flag));

				this.config[flag].printedHelp = true;
			});
		}

		console.log(
			`\n${paint(
				`${this.requiredOptions.length > 0 ? ' Optional ' : ''} Flags `,
				pallette.background.white,
				pallette.black,
				pallette.bold,
			)}\n`,
		);

		Object.keys(this.config).forEach(flag => {
			if ({ __subCommands: true, __tail: true }[flag] || this.config[flag].printedHelp) return;

			console.log(this.#getFlagHelpText(flag));
		});

		exit();
	}

	registerOptions(options = {}) {
		this.config = { ...this.config, ...options };
		this.optionNames = Object.keys(this.config);
		this.flagNames = [];
		this.requiredOptions = [];
		this.aliasMap = {};

		const registerAlias = (alias, flag) => {
			this.flagNames.push(alias);

			this.aliasMap[alias] = flag;
		};

		this.optionNames.forEach(flag => {
			if ({ __subCommands: true, __tail: true }[flag] || !this.config[flag]) return;

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

	#parsePassThrough() {
		this.argArray = Array.from(process.argv).slice(2);

		const passThroughSplit = this.argArray.indexOf('--');

		if (passThroughSplit < 0) return;

		this.passThrough = this.argArray.slice(passThroughSplit + 1, this.argArray.length);
		this.argArray = this.argArray.slice(0, passThroughSplit);
	}

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

	#parseFlags() {
		this.flagNames.forEach(flagName => {
			const optionName = this.aliasMap[flagName] || flagName;

			if (this.config[optionName].match || !this.argArray?.length) return;

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
					// not a flag
					newArguments.push(argument);

					continue;
				}

				flagMatch = flagRegex.exec(argument);

				if (!flagMatch) {
					newArguments.push(argument);

					continue;
				}

				this.config[optionName].match = flagMatch;

				const splitArgument = [
					flagMatch[type === 'boolean' ? 1 : 2],
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
						// use the next argument as the value

						++x;

						value = type === 'boolean' ? parseBool(nextArgument, undefined) : nextArgument;
					} else if (type !== 'boolean') {
						console.log(`Missing value: --${flagName} <${variableName}>\n`);

						exit();
					}
				}

				if (type === 'boolean' && value === undefined)
					this.options[optionName] = splitArgument[0] === 'no' ? false : true;
				else this.options[optionName] = transform(value);

				if (test) this.#testOption(optionName, this.options[optionName], test);
			}

			this.argArray = newArguments;
		});
	}

	#parseTailArgs() {
		if (!this.config.__tail || !this.argArray[0]) return;

		let parsedTailArguments;

		Array.from(this.argArray).forEach((argument, index, argumentArray) => {
			if (parsedTailArguments || argument[0] === '-') {
				parsedTailArguments = true;

				return;
			}

			if (!this.config.__tail[index]) {
				console.warn(`"${argument}" is not a defined tail argument`);

				exit();
			}

			const {
				rest,
				name,
				type = this.defaults.type,
				test = this.defaults.test[type],
				transform = this.defaults.transform[type],
			} = this.config.__subCommands[index];

			if (rest) {
				argument = argumentArray.slice(index);

				this.argArray.splice(index - 1);

				parsedTailArguments = true;
			} else this.argArray.shift();

			argument = transform(argument);

			if (test) this.#testOption(name, argument, test);

			this.options[name] = argument;
		});
	}

	#testOption(name, value, test) {
		const testResults = test(value);

		if (testResults && typeof testResults === 'boolean') return;

		console.log(testResults || `"${name}": "${value}" failed test: ${test.toString()}`, '\n');

		exit();
	}

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
					console.error(`"${option}" is required\n\nFor more information: ${this.packageJSON.name} --help\n`);

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

	#applyDefaultValues() {
		this.optionNames.forEach(flag => {
			const { defaultValue, match } = this.config[flag];

			if (match || defaultValue === undefined) return;

			this.options[flag] = defaultValue;
		});
	}

	parse(options) {
		this.options = {};

		if (options) this.registerOptions(options);

		this.#parsePassThrough();
		this.#parseSubCommands();
		this.#parseFlags();

		if (this.defaults.config.help && this.options.help) this.printHelp();

		if (this.defaults.config.version && this.options.version) {
			console.log(this.versionText);

			exit();
		}

		this.#parseTailArgs();
		this.#enforceRequired();
		this.#applyDefaultValues();

		if (this.argArray.length > 0) {
			console.log(
				`No definition(s) for: [${this.argArray}]\n\nFor more information: ${this.packageJSON.name} --help\n`,
			);

			exit();
		}

		return this;
	}
}

export default Argi;
