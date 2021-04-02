#!/usr/bin/env node

const argi = module.exports = {
	helpText: '',
	defaults: {
		type: 'string',
		transform: {
			string: String,
			number: Number,
			int: parseInt,
			float: parseFloat,
			boolean: Boolean
		},
		config: {
			help: { type: 'boolean', alias: 'h' },
			version: { type: 'boolean' }
		}
	},
	host: require(`${process.cwd()}/package.json`),
	get usageText(){
		let usage = '';

		if(argi.customUsageText) usage = argi.customUsageText;

		else {
			usage += `Usage:\n\n${argi.host.name}`;

			if(argi.config.__subCommands) argi.config.__subCommands.forEach(({ name }) => { usage += ` [${name}]`; });

			argi.requiredOptions.forEach((flag) => {
				usage += ` ${argi.getFlagUsageText(flag)}`;

				argi.config[flag].printedUsage = true;
			});

			usage += ' [';

			Object.keys(argi.config).forEach((flag, index) => {
				if({ __subCommands: true, __tail: true }[flag] || argi.config[flag].printedUsage) return;

				usage += `${index ? ' | ' : ''}${argi.getFlagUsageText(flag)}`;
			});

			usage += ']';

			if(argi.config.__tail) argi.config.__tail.forEach(({ name }) => { usage += ` [${name}]`; });

			usage += '\n';
		}

		return usage;
	},
	set usageText(val){ argi.customUsageText = val; },
	get versionText(){
		const { version, name } = argi.host;

		return argi.customVersionText || `\n[${name}] Version: ${version}\n`;
	},
	set versionText(val){ argi.customVersionText = val; },
	getFlagUsageText: function(flag){
		const { string, type = argi.defaults.type, variableName = type, required } = argi.config[flag];

		return `${required ? '' : '['}${string.replace(/,\s/g, '|')}` + (type === 'boolean' ? '' : ` <${variableName}>`) + (required ? '' : ']');
	},
	getFlagHelpText: function(flag){
		const { type = argi.defaults.type, defaultValue, string, variableName = type } = argi.config[flag];
		let { description = '' } = argi.config[flag];

		if(description.length) description = `\t${description}\n`;

		return `${string}\n\t[${variableName}${typeof defaultValue === 'undefined' ? '' : (' :: '+ defaultValue)}]\n${description}`;
	},
	printHelp: function(){
		console.log(argi.versionText);

		if(argi.helpText !== '') console.log(argi.helpText, '\n');

		console.log(argi.usageText);

		['subCommands', 'tail'].forEach((position) => {
			if(!argi.config[`__${position}`]) return;

			console.log(`\n${position === 'tail' ? 'Tailing Arguments' : 'Sub Commands'}:\n`);

			argi.config[`__${position}`].forEach(({ description, name }) => {
				if(description.length) description = `\n\t${description}\n`;

				console.log(`${name.toUpperCase()}\n\t[${name}]${description}`);
			});
		});

		if(argi.requiredOptions.length){
			console.log('\nRequired Flags:\n');

			argi.requiredOptions.forEach((flag) => {
				console.log(argi.getFlagHelpText(flag));

				argi.config[flag].printedHelp = true;
			});
		}

		console.log(`\n${argi.requiredOptions.length ? 'Optional ' : ''}Flags:\n`);

		Object.keys(argi.config).forEach((flag) => {
			if({ __subCommands: true, __tail: true }[flag] || argi.config[flag].printedHelp) return;

			console.log(argi.getFlagHelpText(flag));
		});

		argi.exit();
	},
	exit: function(){
		process.kill(process.pid, 'SIGTERM');
	},
	registerOptions: function(options = {}){
		argi.config = Object.assign(argi.config || {}, argi.defaults.config, options);
		argi.optionNames = Object.keys(argi.config);
		argi.allOptionNames = [];
		argi.requiredOptions = [];
		argi.aliasMap = argi.aliasMap || {};

		function registerAlias(alias, flag){
			argi.allOptionNames.push(alias);

			argi.aliasMap[alias] = flag;
		}

		argi.optionNames.forEach((flag) => {
			if({ __subCommands: true, __tail: true }[flag]) return;

			const { alias, required } = argi.config[flag];

			if(required) argi.requiredOptions.push(flag);

			argi.allOptionNames.push(flag);

			if(argi.config[flag].string) return;

			argi.config[flag].alias = [flag].concat(alias || []);
			argi.config[flag].string = argi.config[flag].alias.map((alias) => { return `${alias.length > 1 ? '--' : '-'}${alias}`; }).join(', ');

			if(typeof alias === 'string') registerAlias(alias, flag);
			else if(alias instanceof Array) alias.forEach((alias) => { registerAlias(alias, flag); });
		});

		argi.allOptionNames = argi.allOptionNames.sort((a, b) => { return b.length - a.length || a.localeCompare(b); });
	},
	parsePassThrough: function(){
		argi.argArray = Array.from(process.argv).slice(2);

		const passThroughSplit = argi.argArray.indexOf('--');

		if(passThroughSplit < 0) return;

		argi.passThrough = argi.argArray.slice(passThroughSplit + 1, argi.argArray.length);
		argi.argArray = argi.argArray.slice(0, passThroughSplit);
	},
	parseSubCommands: function(){
		if(!argi.config.__subCommands || !argi.argArray[0] || argi.argArray[0][0] === '-') return;

		let parsedSubCommands;

		Array.from(argi.argArray).forEach((arg, index) => {
			if(parsedSubCommands || arg[0] === '-' || !argi.config.__subCommands[index]){
				parsedSubCommands = true;

				return;
			}

			const { test, name, type = argi.defaults.type, transform = argi.defaults.transform[type] } = argi.config.__subCommands[index];

			arg = transform(arg);

			if(test) argi.testOption(name, arg, test);

			argi.argArray.shift();

			argi.options[name] = arg;
		});
	},
	parseTailArgs: function(){
		if(!argi.config.__tail || !argi.argArray[0]) return;

		let parsedTailArgs;

		Array.from(argi.argArray).forEach((arg, index, argArray) => {
			if(parsedTailArgs || arg[0] === '-'){
				parsedTailArgs = true;

				return;
			}

			if(!argi.config.__tail[index]){
				console.warn(`"${arg}" is not a defined tail argument`);

				argi.exit();
			}

			const { rest, test, name, type = argi.defaults.type, transform = argi.defaults.transform[type] } = argi.config.__subCommands[index];

			if(rest){
				arg = argArray.slice(index);

				argi.argArray.splice(index - 1);

				parsedTailArgs = true;
			}

			else argi.argArray.shift();

			arg = transform(arg);

			if(test) argi.testOption(name, arg, test);

			argi.options[name] = arg;
		});
	},
	testOption: function(option, value, test){
		let testResults = test(value);

		if(testResults && typeof testResults === 'boolean') return;

		console.log(testResults || `"${option}": "${value}" failed test: ${test.toString()}`, '\n');

		argi.exit();
	},
	enforceRequired: function(){
		if(argi.config.__subCommands){
			argi.config.__subCommands.forEach((cmd) => {
				if(cmd.required && typeof argi.options[cmd.name] === 'undefined'){
					console.error(`"${cmd.name}" is required: ${argi.host.name}${argi.config.__subCommands.map(({ name }) => { return ` [${name}]`; }).join('')}\n`);

					argi.exit();
				}
			});
		}

		if(argi.requiredOptions){
			argi.requiredOptions.forEach((option) => {
				if(typeof argi.options[option] === 'undefined'){
					console.error(`"${option}" is required\n\nFor more information: ${argi.host.name} --help\n`);

					argi.exit();
				}
			});
		}

		if(argi.config.__tail){
			argi.config.__tail.forEach((cmd) => {
				if(cmd.required && typeof argi.options[cmd.name] === 'undefined'){
					console.error(`"${cmd.name}" is required: ${argi.host.name}${argi.config.__tail.map(({ name }) => { return ` [${name}]`; }).join('')}\n`);

					argi.exit();
				}
			});
		}
	},
	applyDefaultValues: function(){
		argi.optionNames.forEach((flag) => {
			const { defaultValue, match } = argi.config[flag];

			if(match || typeof defaultValue === 'undefined') return;

			argi.options[flag] = defaultValue;
		});
	},
	parse: function(options){
		argi.options = {};

		if(options) argi.registerOptions(options);

		argi.parsePassThrough();
		argi.parseSubCommands();

		argi.allOptionNames.forEach((alias) => {
			const flag = argi.aliasMap[alias] || alias;

			if(argi.config[flag].match || !argi.argArray.length) return;

			const { type = argi.defaults.type, transform = argi.defaults.transform[type], variableName = type, test } = argi.config[flag];

			const flagRegex = alias.length > 1 ? new RegExp(`(^--${type === 'boolean' ? '(no-?)?' : ''}${alias})`) : new RegExp(`^-[^-${alias}]*(${alias})`);

			// console.log(`\n\nParsing ${alias} :: ${argi.argArray} :: ${flagRegex}`);

			let flagMatch, newArgs = [];

			for(let x = 0, count = argi.argArray.length, arg; x < count; ++x){
				arg = argi.argArray[x];

				if(arg[0] !== '-'){
					if(arg) newArgs.push(arg);

					continue;
				}

				flagMatch = flagRegex.exec(arg);

				if(flagMatch){
					argi.config[flag].match = flagMatch;

					if(flagMatch[0] !== arg){
						if(arg[0] === '=') argi.options[flag] = arg.replace(flagMatch[1], '').slice(1);

						else if(type !== 'boolean'){
							const splitArg = arg.split(flagMatch[1]);

							if(splitArg[1]){
								argi.options[flag] = splitArg[1];

								if(splitArg[0] !== '-') newArgs.push(splitArg[0]);
							}
						}

						else newArgs.push(arg.replace(flagMatch[1], ''));
					}

					if(typeof argi.options[flag] === 'undefined'){
						if(type === 'boolean') argi.options[flag] = !flagMatch[2];

						else {
							if(argi.argArray[x + 1] && argi.argArray[x + 1][0] !== '-'){
								++x;

								argi.options[flag] = argi.argArray[x];
							}

							else {
								console.log(`Missing value: --${flag} <${variableName}>\n`);

								argi.exit();
							}
						}
					}

					argi.options[flag] = transform(argi.options[flag]);

					if(test) argi.testOption(flag, argi.options[flag], test);

					newArgs = newArgs.concat(argi.argArray.slice(x + 1));

					break;
				}

				else newArgs.push(arg);
			}

			argi.argArray = newArgs;
		});

		if(argi.defaults.config.help && argi.options.help) argi.printHelp();

		if(argi.defaults.config.version && argi.options.version){
			console.log(argi.versionText);

			argi.exit();
		}

		argi.parseTailArgs();
		argi.enforceRequired();
		argi.applyDefaultValues();

		if(argi.argArray.length){
			console.log(`No definition for: ${argi.argArray}\n\nFor more information: ${argi.host.name} --help\n`);

			argi.exit();
		}
	}
};