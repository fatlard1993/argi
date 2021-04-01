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
		flags: {
			help: { type: 'boolean', alias: 'h' },
			version: { type: 'boolean' }
		}
	},
	host: require(`${process.cwd()}/package.json`),
	get usageText(){
		let usage = '';

		if(argi.customUsageText) usage = argi.customUsageText;

		else{
			usage += `\nUsage:\n\n${argi.host.name}`;

			if(argi.flags.__subCommands) argi.flags.__subCommands.forEach(({ name }) => { usage += ` [${name}]`; });

			argi.requiredOptions.forEach((flag) => {
				usage += ` ${argi.getFlagUsageText(flag)}`;

				argi.flags[flag].printedUsage = true;
			});

			usage += ' [';

			Object.keys(argi.flags).forEach((flag, index) => {
				if({ __subCommands: true, __tail: true }[flag] || argi.flags[flag].printedUsage) return;

				usage += `${index ? ' | ' : ''}${argi.getFlagUsageText(flag)}`;
			});

			usage += ']';

			if(argi.flags.__tail) argi.flags.__tail.forEach(({ name }) => { usage += ` [${name}]`; });

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
		const { string, type = argi.defaults.type, variableName = type, required } = argi.flags[flag];

		return `${required ? '' : '['}${string.replace(/,\s/g, '|')}` + (type === 'boolean' ? '' : ` <${variableName}>`) + (required ? '' : ']');
	},
	getFlagHelpText: function(flag){
		const { type = argi.defaults.type, defaultValue, string, variableName = type } = argi.flags[flag];
		let { description = '' } = argi.flags[flag];

		if(description.length) description = `\t${description}\n`;

		return `${string}\n\t[${variableName}${typeof defaultValue === 'undefined' ? '' : (' :: '+ defaultValue)}]\n${description}`;
	},
	printHelp: function(){
		console.log(argi.versionText);

		if(argi.helpText !== '') console.log(argi.helpText);

		console.log(argi.usageText);

		['subCommands', 'tail'].forEach((position) => {
			console.log(`\n${position === 'tail' ? 'Tailing Arguments' : 'Sub Commands'}:\n`);

			argi.flags[`__${position}`].forEach(({ description, name }) => {
				if(description.length) description = `\n\t${description}\n`;

				console.log(`${name.toUpperCase()}\n\t[${name}]${description}`);
			});
		});

		console.log('\nRequired Flags:\n');

		argi.requiredOptions.forEach((flag) => {
			console.log(argi.getFlagHelpText(flag));

			argi.flags[flag].printedHelp = true;
		});

		console.log('\nOptional Flags:\n');

		Object.keys(argi.flags).forEach((flag) => {
			if({ __subCommands: true, __tail: true }[flag] || argi.flags[flag].printedHelp) return;

			console.log(argi.getFlagHelpText(flag));
		});

		process.kill(process.pid, 'SIGTERM');
	},
	registerFlags: function(flagConfig = {}){
		argi.flags = Object.assign(argi.defaults.flags, flagConfig);
		argi.flagNames = Object.keys(argi.flags);
		argi.allFlags = [];
		argi.requiredOptions = [];
		argi.aliasMap = {};

		argi.flagNames.forEach((flag) => {
			if({ __subCommands: true, __tail: true }[flag]) return;

			argi.allFlags.push(flag);

			const { alias, required } = argi.flags[flag];

			if(required) argi.requiredOptions.push(flag);

			argi.flags[flag].alias = [flag].concat(alias || []);
			argi.flags[flag].string = argi.flags[flag].alias.map((alias) => { return `${alias.length > 1 ? '--' : '-'}${alias}`; }).join(', ');

			if(typeof alias === 'string') argi.aliasMap[alias] = flag;
			else if(alias instanceof Array) alias.forEach((alias) => { argi.aliasMap[alias] = flag; });
		});

		argi.allFlags = Object.keys(argi.aliasMap).concat(argi.allFlags).sort((a, b) => { return b.length - a.length; });
	},
	parsePassThrough: function(){
		argi.argArray = Array.from(process.argv).slice(2);

		const passThroughSplit = argi.argArray.indexOf('--');

		if(passThroughSplit < 0) return;

		argi.passThrough = argi.argArray.slice(passThroughSplit + 1, argi.argArray.length);
		argi.argArray = argi.argArray.slice(0, passThroughSplit);
	},
	parseSubCommands: function(){
		if(!argi.flags.__subCommands || !argi.argArray[0] || argi.argArray[0][0] === '-') return;

		let parsedSubCommands;

		Array.from(argi.argArray).forEach((arg, index) => {
			if(parsedSubCommands || arg[0] === '-'){
				parsedSubCommands = true;

				return;
			}

			if(!argi.flags.__subCommands[index]) return console.warn(`"${arg}" is not a defined sub command`);

			const { test, name, transform } = argi.flags.__subCommands[index];

			if(transform) arg = transform(arg);

			if(test) argi.testOption(name, arg, test);

			argi.argArray.shift();

			argi.options[name] = arg;
		});
	},
	parseTailArgs: function(){
		if(!argi.flags.__tail || !argi.argArray[0]) return;

		let parsedTailArgs;

		Array.from(argi.argArray).forEach((arg, index, argArray) => {
			if(parsedTailArgs || arg[0] === '-'){
				parsedTailArgs = true;

				return;
			}

			if(!argi.flags.__tail[index]) return console.warn(`"${arg}" is not a defined tail argument`);

			const { rest, test, name, transform } = argi.flags.__tail[index];

			if(rest){
				arg = argArray.slice(index);

				argi.argArray.splice(index - 1);

				parsedTailArgs = true;
			}

			else argi.argArray.shift();

			if(transform) arg = transform(arg);

			if(test) argi.testOption(name, arg, test);

			argi.options[name] = arg;
		});
	},
	testOption: function(option, value, test){
		let testResults = test(value);

		if(testResults && typeof testResults === 'boolean') return;

		console.log(testResults || `"${option}": "${value}" failed test: ${test.toString()}`, '\n');

		process.kill(process.pid, 'SIGTERM');
	},
	enforceRequired: function(){
		if(argi.flags.__subCommands){
			argi.flags.__subCommands.forEach((cmd) => {
				if(cmd.required && typeof argi.options[cmd.name] === 'undefined'){
					console.error(`"${cmd.name}" is required: ${argi.host.name}${argi.flags.__subCommands.map(({ name }) => { return ` [${name}]`; }).join('')}\n`);

					process.kill(process.pid, 'SIGTERM');
				}
			});
		}

		if(argi.requiredOptions){
			argi.requiredOptions.forEach((option) => {
				if(typeof argi.options[option] === 'undefined'){
					console.error(`"${option}" is required\n\nFor more information: ${argi.host.name} --help\n`);

					process.kill(process.pid, 'SIGTERM');
				}
			});
		}

		if(argi.flags.__tail){
			argi.flags.__tail.forEach((cmd) => {
				if(cmd.required && typeof argi.options[cmd.name] === 'undefined'){
					console.error(`"${cmd.name}" is required: ${argi.host.name}${argi.flags.__tail.map(({ name }) => { return ` [${name}]`; }).join('')}\n`);

					process.kill(process.pid, 'SIGTERM');
				}
			});
		}
	},
	applyDefaultValues: function(){
		argi.flagNames.forEach((flag) => {
			const { defaultValue, match } = argi.flags[flag];

			if(match || typeof defaultValue === 'undefined') return;

			argi.options[flag] = defaultValue;
		});
	},
	parse: function(flagConfig){
		argi.options = {};

		argi.registerFlags(flagConfig);

		argi.parsePassThrough();
		argi.parseSubCommands();

		argi.allFlags.forEach((alias) => {
			const flag = argi.aliasMap[alias] || alias;

			if(argi.flags[flag].match || !argi.argArray.length) return;

			const { type = argi.defaults.type, transform = argi.defaults.transform[type], variableName = type, test } = argi.flags[flag];

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
					argi.flags[flag].match = flagMatch;

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

								process.kill(process.pid, 'SIGTERM');
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

		if(argi.defaults.flags.help && argi.options.help) argi.printHelp();

		if(argi.defaults.flags.version && argi.options.version){
			console.log(argi.versionText);

			process.kill(process.pid, 'SIGTERM');
		}

		argi.parseTailArgs();
		argi.enforceRequired();
		argi.applyDefaultValues();

		if(argi.argArray.length){
			console.log(`No definition for: ${argi.argArray}\n\nFor more information: ${argi.host.name} --help\n`);

			process.kill(process.pid, 'SIGTERM');
		}
	}
};