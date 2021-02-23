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

			if(argi.flags.subCommands) Object.keys(argi.flags.subCommands).forEach((subCommand) => { usage += ` [${argi.flags.subCommands[subCommand].key}]`; });

			usage += ' [';

			Object.keys(argi.flags).forEach((flag, index) => {
				if(flag === 'subCommands') return;

				const { string, type = argi.defaults.type, variableName = type } = argi.flags[flag];

				usage += `${index ? ' | ' : ''}[${string.replace(/,\s/g, '|')}` + (type === 'boolean' ? ']' : ` <${variableName}>]`);
			});

			usage += ']\n';
		}

		return usage;
	},
	set usageText(val){ argi.customUsageText = val; },
	get versionText(){
		const { version, name } = argi.host;

		return argi.customVersionText || `\n[${name}] Version: ${version}\n`;
	},
	set versionText(val){ argi.customVersionText = val; },
	parse: function(flags){
		const defaults = argi.defaults;

		flags = Object.assign(defaults.flags, flags);

		const aliasMap = {}, longFlags = [], shortFlags = [];
		const result = { named: {} };

		Object.keys(flags).forEach((flag) => {
			if(flag === 'subCommands') return;

			const { alias, type = defaults.type, defaultValue = defaults.value[type], transform = defaults.transform[type] } = flags[flag];

			flags[flag].string = [flag].concat(alias || []).map((alias) => { return `${alias.length > 1 ? '--' : '-'}${alias}`; }).join(', ');

			result.named[flag] = transform(defaultValue);

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
			result.passThrough = argi.array.slice(splitIndex + 1, argi.array.length - 1);
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

			if(argi.flags.subCommands){
				console.log('\nSub Commands:\n');

				Object.keys(argi.flags.subCommands).forEach((subCommand) => {
					let { key, description } = argi.flags.subCommands[subCommand];

					if(description.length) description = `\n\t${description}\n`;

					console.log(`${subCommand.toUpperCase()}\n\t[${key}]${description}`);
				});
			}

			console.log('\nOptions:\n');

			Object.keys(flags).forEach((flag) => {
				if(flag === 'subCommands') return;

				const { type = defaults.type, defaultValue = defaults.value[type], string, variableName = type } = flags[flag];
				let { description = '' } = flags[flag];

				if(description.length) description = `\t${description}\n`;

				console.log(`${string}\n\t[${variableName} :: ${defaultValue}]\n${description}`);
			});

			process.kill(process.pid, 'SIGTERM');
		}

		if(argi.defaults.flags.version && result.named.version){
			console.log(argi.versionText);

			process.kill(process.pid, 'SIGTERM');
		}

		return argi;
	}
};