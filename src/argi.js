import findRoot from 'find-root';

import { escapeRegex, transformBoolean, exit } from './utils';

const colors = {
	__reset: '\x1b[0m',
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
	}
};

const paint = (text, color) => `${color}${text}${colors.__reset}`;

const argi = {
	helpText: '',
	defaults: {
		type: 'string',
		transform: {
			string: String,
			number: Number,
			boolean: transformBoolean,
		},
		test: {
			number: value => !Number.isNaN(value),
		},
		config: {
			help: { type: 'boolean', alias: ['h', '?'] },
			version: { type: 'boolean' },
		},
	},
	// eslint-disable-next-line unicorn/prefer-module
	package: require(`${findRoot(process.cwd())}/package.json`),
	get usageText() {
		if (argi._usageText) return argi._usageText;
		let usage = `Usage:\n\n${argi.package.name}`;

		if (argi.config.__subCommands) argi.config.__subCommands.forEach(({ name }) => (usage += ` [${paint(name, colors.magenta)}]`));

		argi.requiredOptions.forEach(flag => {
			usage += ` ${argi.getFlagUsageText(flag)}`;

			argi.config[flag].printedUsage = true;
		});

		usage += ' [';

		Object.keys(argi.config).forEach((flag, index) => {
			if ({ __subCommands: true, __tail: true }[flag] || argi.config[flag].printedUsage) return;

			usage += `${index ? ' | ' : ''}${argi.getFlagUsageText(flag)}`;
		});

		usage += ']';

		if (argi.config.__tail) argi.config.__tail.forEach(({ name }) => (usage += ` [${paint(name, colors.magenta)}]`));

		usage += '\n';

		return usage;
	},
	set usageText(value) {
		argi._usageText = value;
	},
	get versionText() {
		const { version, name } = argi.package;

		return argi._versionText || `\n[${name}] Version: ${version}\n`;
	},
	set versionText(value) {
		argi._versionText = value;
	},
	getFlagUsageText(flag) {
		const { string, type = argi.defaults.type, variableName = type, required } = argi.config[flag];

		return (
			`${required ? '' : '['}${paint(string.replaceAll(/,\s/g, '|'), colors.blue)}` +
			(type === 'boolean' ? '' : ` <${paint(variableName, colors.cyan)}>`) +
			(required ? '' : ']')
		);
	},
	getFlagHelpText(flag) {
		const { type = argi.defaults.type, defaultValue, string, variableName = type } = argi.config[flag];
		let { description = '' } = argi.config[flag];

		if (description.length > 0) description = `\t${description}\n`;

		return `${paint(string, colors.blue)}\n\t[${paint(variableName, colors.cyan)}${
			defaultValue === undefined ? '' : ' :: ' + paint(defaultValue, colors.green)
		}]\n${description}`;
	},
	printHelp() {
		console.log(argi.versionText);

		if (argi.helpText !== '') console.log(argi.helpText, '\n');

		console.log(argi.usageText);

		['subCommands', 'tail'].forEach(position => {
			if (!argi.config[`__${position}`]) return;

			console.log(`\n${position === 'tail' ? 'Tailing Arguments' : 'Sub Commands'}:\n`);

			argi.config[`__${position}`].forEach(({ description, name }) => {
				if (description.length > 0) description = `\n\t${description}\n`;

				console.log(
					`${name.toUpperCase()}\n\t[${paint(name, colors.magenta)}]${description}`,
				);
			});
		});

		if (argi.requiredOptions.length > 0) {
			console.log('\nRequired Flags:\n');

			argi.requiredOptions.forEach(flag => {
				console.log(argi.getFlagHelpText(flag));

				argi.config[flag].printedHelp = true;
			});
		}

		console.log(`\n${argi.requiredOptions.length > 0 ? 'Optional ' : ''}Flags:\n`);

		Object.keys(argi.config).forEach(flag => {
			if ({ __subCommands: true, __tail: true }[flag] || argi.config[flag].printedHelp) return;

			console.log(argi.getFlagHelpText(flag));
		});

		exit();
	},
	registerOptions(options = {}) {
		argi.config = Object.assign(argi.config || {}, argi.defaults.config, options);
		argi.optionNames = Object.keys(argi.config);
		argi.flagNames = [];
		argi.requiredOptions = [];
		argi.aliasMap = argi.aliasMap || {};

		const registerAlias = (alias, flag) => {
			argi.flagNames.push(alias);

			argi.aliasMap[alias] = flag;
		};

		argi.optionNames.forEach(flag => {
			if ({ __subCommands: true, __tail: true }[flag]) return;

			const { alias, required } = argi.config[flag];

			if (required) argi.requiredOptions.push(flag);

			argi.flagNames.push(flag);

			if (argi.config[flag].string) return;

			argi.config[flag].alias = [flag].concat(alias || []);
			argi.config[flag].string = argi.config[flag].alias
				.map(alias => `${alias.length > 1 ? '--' : '-'}${alias}`)
				.join(', ');

			if (typeof alias === 'string') registerAlias(alias, flag);
			else if (Array.isArray(alias)) alias.forEach(alias => registerAlias(alias, flag));
		});

		argi.flagNames = argi.flagNames.sort((a, b) => b.length - a.length || a.localeCompare(b));
	},
	parsePassThrough() {
		argi.argArray = Array.from(process.argv).slice(2);

		const passThroughSplit = argi.argArray.indexOf('--');

		if (passThroughSplit < 0) return;

		argi.passThrough = argi.argArray.slice(passThroughSplit + 1, argi.argArray.length);
		argi.argArray = argi.argArray.slice(0, passThroughSplit);
	},
	parseSubCommands() {
		if (!argi.config.__subCommands || !argi.argArray[0] || argi.argArray[0][0] === '-') return;

		let parsedSubCommands;

		Array.from(argi.argArray).forEach((argument, index) => {
			if (parsedSubCommands || argument[0] === '-' || !argi.config.__subCommands[index]) {
				parsedSubCommands = true;

				return;
			}

			const {
				test,
				name,
				type = argi.defaults.type,
				transform = argi.defaults.transform[type],
			} = argi.config.__subCommands[index];

			argument = transform(argument);

			if (test) argi.testOption(name, argument, test);

			argi.argArray.shift();

			argi.options[name] = argument;
		});
	},
	parseTailArgs() {
		if (!argi.config.__tail || !argi.argArray[0]) return;

		let parsedTailArguments;

		Array.from(argi.argArray).forEach((argument, index, argumentArray) => {
			if (parsedTailArguments || argument[0] === '-') {
				parsedTailArguments = true;

				return;
			}

			if (!argi.config.__tail[index]) {
				console.warn(`"${argument}" is not a defined tail argument`);

				exit();
			}

			const {
				rest,
				test,
				name,
				type = argi.defaults.type,
				transform = argi.defaults.transform[type],
			} = argi.config.__subCommands[index];

			if (rest) {
				argument = argumentArray.slice(index);

				argi.argArray.splice(index - 1);

				parsedTailArguments = true;
			} else argi.argArray.shift();

			argument = transform(argument);

			if (test) argi.testOption(name, argument, test);

			argi.options[name] = argument;
		});
	},
	testOption(option, value, test) {
		const testResults = test(value);

		if (testResults && typeof testResults === 'boolean') return;

		console.log(testResults || `"${option}": "${value}" failed test: ${test.toString()}`, '\n');

		exit();
	},
	enforceRequired() {
		if (argi.config.__subCommands) {
			argi.config.__subCommands.forEach(command => {
				if (command.required && argi.options[command.name] === undefined) {
					console.error(
						`"${command.name}" is required: ${argi.package.name}${argi.config.__subCommands
							.map(({ name }) => {
								return ` [${name}]`;
							})
							.join('')}\n`,
					);

					exit();
				}
			});
		}

		if (argi.requiredOptions) {
			argi.requiredOptions.forEach(option => {
				if (argi.options[option] === undefined) {
					console.error(`"${option}" is required\n\nFor more information: ${argi.package.name} --help\n`);

					exit();
				}
			});
		}

		if (argi.config.__tail) {
			argi.config.__tail.forEach(command => {
				if (command.required && argi.options[command.name] === undefined) {
					console.error(
						`"${command.name}" is required: ${argi.package.name}${argi.config.__tail
							.map(({ name }) => {
								return ` [${name}]`;
							})
							.join('')}\n`,
					);

					exit();
				}
			});
		}
	},
	applyDefaultValues() {
		argi.optionNames.forEach(flag => {
			const { defaultValue, match } = argi.config[flag];

			if (match || defaultValue === undefined) return;

			argi.options[flag] = defaultValue;
		});
	},
	parse(options) {
		argi.options = {};

		if (options) argi.registerOptions(options);

		argi.parsePassThrough();
		argi.parseSubCommands();

		argi.flagNames.forEach(alias => {
			const flag = argi.aliasMap[alias] || alias;

			if (argi.config[flag].match || !argi.argArray?.length) return;

			const {
				type = argi.defaults.type,
				transform = argi.defaults.transform[type],
				variableName = type,
				test = argi.defaults.test[type],
				defaultValue,
			} = argi.config[flag];

			const longFlag = alias.length > 1;
			const newArguments = [];
			const flagRegex = longFlag
				? new RegExp(`^--(${type === 'boolean' ? '(no-?)?' : ''}(${escapeRegex(alias)}).*)`)
				: new RegExp(`^-([^-=]*(${escapeRegex(alias)}).*)`);

			for (let x = 0, count = argi.argArray.length, argument, flagMatch; x < count; ++x) {
				argument = argi.argArray[x];

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

				argi.config[flag].match = flagMatch;

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
					const nextArgument = argi.argArray[x + 1];

					if (
						nextArgument &&
						nextArgument[0] !== '-' &&
						(type !== 'boolean' || transformBoolean(nextArgument) !== undefined)
					) {
						// use the next argument as the value

						++x;

						value = type === 'boolean' ? transformBoolean(nextArgument) : nextArgument;
					} else if (type !== 'boolean') {
						console.log(`Missing value: --${flag} <${variableName}>\n`);

						exit();
					}
				}

				if (type === 'boolean' && value === undefined) argi.options[flag] = splitArgument[0] === 'no' ? false : true;
				else argi.options[flag] = transform(value);

				if (test) argi.testOption(flag, argi.options[flag], test);
			}

			argi.argArray = newArguments;
		});

		if (argi.defaults.config.help && argi.options.help) argi.printHelp();

		if (argi.defaults.config.version && argi.options.version) {
			console.log(argi.versionText);

			exit();
		}

		argi.parseTailArgs();
		argi.enforceRequired();
		argi.applyDefaultValues();

		if (argi.argArray.length > 0) {
			console.log(`No definition(s) for: [${argi.argArray}]\n\nFor more information: ${argi.package.name} --help\n`);

			exit();
		}

		return argi;
	},
};

export default argi;
