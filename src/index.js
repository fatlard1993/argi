#!/usr/bin/env node

const argi = module.exports = {
	helpText: '',
	strict: false,
	defaults: {
		type: 'string',
		value: {
			string: '',
			number: 0,
			int: 0,
			float: 0.0,
			boolean: false
		},
		transform: {
			string: (value) => { return value; },
			number: (value) => { return Number(value); },
			int: (value) => { return parseInt(value); },
			float: (value) => { return parseFloat(value); },
			boolean: (value) => { return value; }
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

			if(argi.flags.__subCommands) argi.flags.__subCommands.forEach(({ key }) => { usage += ` [${key}]`; });

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

			if(argi.flags.__tail) argi.flags.__tail.forEach(({ key }) => { usage += ` [${key}]`; });

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
		const { type = argi.defaults.type, defaultValue = argi.defaults.value[type], string, variableName = type } = argi.flags[flag];
		let { description = '' } = argi.flags[flag];

		if(description.length) description = `\t${description}\n`;

		return `${string}\n\t[${variableName} :: ${defaultValue}]\n${description}`;
	},
	registerFlags: function(){
		argi.flagNames.forEach((flag) => {
			if({ __subCommands: true, __tail: true }[flag]) return;

			const { alias } = argi.flags[flag];

			argi.flags[flag].alias = [flag].concat(alias || []);
			argi.flags[flag].string = argi.flags[flag].alias.map((alias) => { return `${alias.length > 1 ? '--' : '-'}${alias}`; }).join(', ');

			if(typeof alias === 'string') argi.aliasMap[alias] = flag;
			else if(alias instanceof Array) alias.forEach((alias) => { argi.aliasMap[alias] = flag; });
		});

		argi.allFlags = Object.keys(argi.aliasMap).concat(argi.flagNames).sort((a, b) => { return b.length - a.length; });
	},
	parsePassThrough: function(){
		const passThroughSplit = argi.argArray.indexOf('--');

		if(passThroughSplit >= 0){
			argi.passThrough = argi.argArray.slice(passThroughSplit + 1, argi.argArray.length);
			argi.argArray = argi.argArray.slice(0, passThroughSplit);
		}
	},
	parse2: function(flagConfig){
		const { defaults } = argi;

		console.log(process.argv);

		argi.flags = Object.assign(defaults.flags, flagConfig);
		argi.flagNames = Object.keys(argi.flags);
		argi.argString = process.argv.slice(2).join(' ');
		argi.aliasMap = {};
		argi.options = {};

		if(argi.argString.includes(' -- ')){
			const splitArgString = argi.argString.split(' -- ');

			argi.argString = splitArgString[0];
			argi.passThrough = splitArgString[1];
		}

		argi.flagNames.forEach((flag) => {
			if({ __subCommands: true, __tail: true }[flag]) return;

			const { alias } = argi.flags[flag];

			argi.flags[flag].alias = [flag].concat(alias || []);
			argi.flags[flag].string = argi.flags[flag].alias.map((alias) => { return `${alias.length > 1 ? '--' : '-'}${alias}`; }).join(', ');

			if(typeof alias === 'string') argi.aliasMap[alias] = flag;
			else if(alias instanceof Array) alias.forEach((alias) => { argi.aliasMap[alias] = flag; });
		});

		//todo parse out positional args

		const allFlags = Object.keys(argi.aliasMap).concat(argi.flagNames).sort((a, b) => { return b.length - a.length; });

		// console.log(allFlags);

		for(let x = 0, count = allFlags.length, alias, flag; x < count; ++x){
			alias = allFlags[x];
			flag = argi.aliasMap[alias] || alias;

			if(argi.flags[flag].match) continue;

			const { type } = argi.flags[flag];

			const flagRegex = new RegExp(`${alias.length > 1 ? '--?' : '-*?[^\\s-]*-?'}(${type === 'boolean' ? '(no-?)?' : ''}${alias}[\\s-]?${type === 'boolean' ? '' : '[\\s=]?([^\\s-]+)'})`);
			// -*?[^\s-]*(-?n[\s-]?[\s=]?([^\s-]+))
			const flagMatch = flagRegex.exec(argi.argString);

			console.log(flagRegex, argi.argString, flagMatch);

			if(!flagMatch) continue;

			argi.flags[flag].match = flagMatch;

			argi.argString = argi.argString.replace(flagMatch[1], '');
		}

		Object.keys(argi.flags).forEach((flag) => {
			if({ __subCommands: true, __tail: true }[flag]) return;

			const { type = defaults.type, defaultValue = defaults.value[type], transform = defaults.transform[type], required } = argi.flags[flag];

			if(!argi.flags[flag].match && required){
				console.error(`"${flag}" is required .. See --help for more information\n`);

				process.kill(process.pid, 'SIGTERM');
			}

			if(argi.flags[flag].match){
				if(type === 'boolean') argi.options[flag] = transform(argi.flags[flag].match[1] ? defaultValue : !defaultValue);

				else argi.options[flag] = transform(argi.flags[flag].match[1]);
			}

			else argi.options[flag] = transform(defaultValue);

			if(required){
				if(!argi.requiredOptions) argi.requiredOptions = [flag];

				else argi.requiredOptions.push(flag);
			}
		});
	},
	parse3: function(flagConfig){
		const { defaults } = argi;

		argi.flags = Object.assign(defaults.flags, flagConfig);
		argi.flagNames = Object.keys(argi.flags);
		argi.argArray = process.argv.slice(2);
		argi.aliasMap = {};
		argi.options = {};

		argi.registerFlags();
		argi.parsePassThrough();

		console.log(argi.argArray, argi.allFlags, argi.aliasMap);

		argi.allFlags.forEach((alias) => {
			const flag = argi.aliasMap[alias] || alias;

			if(argi.flags[flag].match || !argi.argArray.length) return;

			console.log(`\n\nParsing ${alias} :: ${argi.argArray}`);

			const { type, required } = argi.flags[flag];

			let flagRegex, flagMatch;// = new RegExp(`${alias.length > 1 ? '--?' : '-*?[^\\s-]*-?'}(${type === 'boolean' ? '(no-?)?' : ''}${alias}[\\s-]?${type === 'boolean' ? '' : '[\\s=]?([^\\s-]+)'})`);

			if(alias.length > 1){
				flagRegex = new RegExp(`(^--${type === 'boolean' ? '(no-?)?' : ''}${alias})`);
			}

			else {
				flagRegex = new RegExp(`^-[^-${alias}]*(${alias})`);
			}

			let newArgs = [];

			for(let x = 0, count = argi.argArray.length, arg; x < count; ++x){
				arg = argi.argArray[x];

				// if(argi.flags[flag].match) break;

				if(arg[0] !== '-'){
					console.log(arg, 'NOT A FLAG');

					if(arg) newArgs.push(arg);

					continue;
				}

				flagMatch = flagRegex.exec(arg);

				if(flagMatch){
					console.log(arg, flagRegex, flagMatch);

					argi.flags[flag].match = flagMatch;

					if(flagMatch[0] !== arg){
						// arg = arg.replace(flagMatch[1], '');

						console.log('MORE', arg);

						if(arg[0] === '=') argi.options[flag] = arg.replace(flagMatch[1], '').slice(1);
						else if(type !== 'boolean'){
							const splitArg = arg.split(flagMatch[1]);

							console.log(splitArg);

							if(splitArg[1]){
								argi.options[flag] = splitArg[1];
								newArgs.push(splitArg[0]);
							}
						}
						else newArgs.push(arg.replace(flagMatch[1], ''));
					}

					if(!argi.options[flag]){
						console.log('no value');

						if(type === 'boolean'){
							argi.options[flag] = !flagMatch[2];
						}

						else {
							if(argi.argArray[x + 1] && argi.argArray[x + 1][0] !== '-'){
								++x;
								console.log('grabbing next value', argi.argArray[x]);

								argi.options[flag] = argi.argArray[x];
							}
							else console.log('requires a value');
						}
					}

					newArgs = newArgs.concat(argi.argArray.slice(x + 1));

					break;
				}
				else newArgs.push(arg);
			}

			argi.argArray = newArgs;

			// console.log(flagRegex, argi.argString, flagMatch);

			// if(!flagMatch) return;

			// argi.flags[flag].match = flagMatch;

			// argi.argString = argi.argString.replace(flagMatch[1], '');
		});

		console.log('Unparsed arguments: ', argi.argArray);
	},
	parse: function(flags){
		const defaults = argi.defaults;

		argi.flags = flags = Object.assign(defaults.flags, flags);

		const aliasMap = {}, longFlags = [], shortFlags = [];
		const result = { named: {} };

		Object.keys(flags).forEach((flag) => {
			if({ __subCommands: true, __tail: true }[flag]) return;

			const { alias, type = defaults.type, defaultValue = defaults.value[type], transform = defaults.transform[type], required } = flags[flag];

			flags[flag].string = [flag].concat(alias || []).map((alias) => { return `${alias.length > 1 ? '--' : '-'}${alias}`; }).join(', ');

			result.named[flag] = transform(defaultValue);

			if(required && defaultValue === defaults.value[type]){
				if(!argi.requiredOptions) argi.requiredOptions = [flag];

				else argi.requiredOptions.push(flag);
			}

			if(flag.length > 1) longFlags.push(flag);

			if(typeof alias === 'string'){
				aliasMap[alias] = flag;

				if(alias.length > 1) longFlags.push(alias);
				else shortFlags.push(alias);
			}

			if(alias instanceof Array) alias.forEach((alias) => {
				aliasMap[alias] = flag;

				if(alias.length > 1) longFlags.push(alias);
				else shortFlags.push(alias);
			});
		});

		argi.array = Array.from(process.argv).slice(2).join('=').split('=');
		argi.flags = flags;
		argi.aliasMap = aliasMap;
		argi.longFlags = longFlags;
		argi.shortFlags = shortFlags;

		const longFlagsRegex = new RegExp(`^(${longFlags.join('|')})(.+)`);
		const shortFlagsRegex = new RegExp(shortFlags.join('|'), 'g');
		const splitIndex = argi.array.indexOf('--');

		if(splitIndex >= 0){
			result.passThrough = argi.array.slice(splitIndex + 1, argi.array.length);
			argi.array = argi.array.slice(0, splitIndex);
		}

		let hasFlags = false;

		function parseFlag(flag, args, value){
			let flagConfig = flags[flag];

			hasFlags = true;

			if(!flagConfig){
				if(!aliasMap[flag]){
					const flagMatches = longFlagsRegex.exec(flag);

					if(flagMatches && flagMatches[1].length){
						flag = flagMatches[1];
						flagConfig = flags[flag];

						if(!flagConfig){
							flag = aliasMap[flag];
							flagConfig = flags[flag];
						}

						value = flagMatches[2];
					}

					else{
						flag = `${flag.length > 1 ? '--' : '-'}${flag}`;

						if(argi.strict){
							console.log(`\nFlag "${flag}" does not exist\n\nFor more information: ${argi.host.name} --help\n`);

							process.kill(process.pid, 'SIGTERM');
						}

						if(!result.unspecified) result.unspecified = [];

						result.unspecified.push(flag);

						return;
					}
				}

				else{
					flag = aliasMap[flag];
					flagConfig = flags[flag];
				}
			}

			const { type = defaults.type, defaultValue = defaults.value[type], transform = defaults.transform[type] } = flagConfig;

			if(typeof value === 'undefined' || value === ''){
				if(type === 'boolean'){
					value = { true: true, false: false }[args[0]];

					if(typeof value === 'undefined') value = !defaultValue;

					else args.shift();
				}

				else if(!args[0] || args[0][0] === '-') value = defaultValue;

				else value = args.shift();
			}

			result.named[flag] = transform(value);
		}

		function parseArg(argsArr){
			let arg = argsArr.shift();

			if(arg[0] === '-'){
				if(arg[1] === '-') parseFlag(arg.slice(2), argsArr);

				else{
					arg = arg.slice(1);

					const value = arg.replace(shortFlagsRegex, '');

					if(value && value !== arg) arg = arg.replace(value, '');

					arg.split('').forEach((letter, index) => { parseFlag(letter, argsArr, arg.length - 1 === index && value); });
				}
			}

			else if(arg !== ''){
				const position = hasFlags ? 'tail' : 'subCommands';

				if(!result[position]) result[position] = [];

				result[position].push(arg);
			}

			if(argsArr.length) parseArg(argsArr);
		}

		parseArg(argi.array.slice());

		argi.options = result;

		if(argi.defaults.flags.help && result.named.help){
			console.log(argi.versionText);

			if(argi.helpText !== '') console.log(argi.helpText);

			console.log(argi.usageText);

			['subCommands', 'tail'].forEach((position) => {
				console.log(`\n${position === 'tail' ? 'Tailing Arguments' : 'Sub Commands'}:\n`);

				argi.flags[`__${position}`].forEach(({ key, description, name = key }) => {
					if(description.length) description = `\n\t${description}\n`;

					console.log(`${name.toUpperCase()}\n\t[${key}]${description}`);
				});
			});

			console.log('\nRequired Flags:\n');

			argi.requiredOptions.forEach((flag) => {
				console.log(argi.getFlagHelpText(flag));

				argi.flags[flag].printedHelp = true;
			});

			console.log('\nOptional Flags:\n');

			Object.keys(flags).forEach((flag) => {
				if({ __subCommands: true, __tail: true }[flag] || argi.flags[flag].printedHelp) return;

				console.log(argi.getFlagHelpText(flag));
			});

			process.kill(process.pid, 'SIGTERM');
		}

		if(argi.defaults.flags.version && result.named.version){
			console.log(argi.versionText);

			process.kill(process.pid, 'SIGTERM');
		}

		if(argi.requiredOptions){
			argi.requiredOptions.forEach((option) => {
				if(typeof result[option] === 'undefined'){
					console.log(`\n"${option}" is required\n\nFor more information: ${argi.host.name} --help\n`);

					process.kill(process.pid, 'SIGTERM');
				}
			});
		}

		return argi;
	}
};