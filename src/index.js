#!/usr/bin/env node

const argi = module.exports = {
	helpText: '',
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
		let usage = argi.customUsageText || `\nUsage: ${argi.host.name} [--${argi.longFlags.join('|--')}|-${argi.shortFlags.join('|-')}]\n`;

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

		let aliasMap = {}, longFlags = [], shortFlags = [];
		const result = {
			named: {},
			array: []
		};

		Object.keys(flags).forEach((flag) => {
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

		argi.flags = flags;
		argi.aliasMap = aliasMap;
		argi.longFlags = longFlags;
		argi.shortFlags = shortFlags;

		longFlagsRegex = new RegExp(`^(${longFlags.join('|')})(.+)`);
		shortFlagsRegex = new RegExp(shortFlags.join('|'), 'g');

		function parseFlag(flag, args, value){
			let flagConfig = flags[flag];

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

					else return result.array.push(flag);
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

					if(value) arg = arg.replace(value, '');

					arg.split('').forEach((letter, index) => { parseFlag(letter, argsArr, arg.length - 1 === index && value); });
				}
			}

			else result.array.push(arg);

			if(argsArr.length) parseArg(argsArr);
		}

		parseArg(Array.from(process.argv).slice(2).join('=').split('='));

		argi.options = result;

		if(argi.defaults.flags.help && result.named.help){
			console.log(argi.versionText);

			if(argi.helpText !== '') console.log(argi.helpText);

			console.log(argi.usageText);

			Object.keys(flags).forEach((flag) => {
				let { description = '', type = defaults.type, defaultValue = defaults.value[type], string } = flags[flag];

				if(description.length) description = `\t${description}\n`;

				console.log(`${string}\n\t[${type} :: ${defaultValue}]\n${description}`);
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