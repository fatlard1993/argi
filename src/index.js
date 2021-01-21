#!/usr/bin/env node

const argi = module.exports = {
	defaults: {
		type: 'boolean',
		value: {
			string: '',
			boolean: false
		},
		transform: {
			string: (value) => { return value; },
			boolean: (value) => {
				value = { undefined: true, string: { true: true, false: false }[value], boolean: value }[typeof value];

				return value;
			}
		},
		flags: {
			help: {
				alias: ['h'],
				description: 'Shows the descriptions and aliases for all supported arguments, then exits'
			}
		}
	},
	parse: function(flags){
		const defaults = argi.defaults;

		flags = Object.assign(defaults.flags, flags);

		let aliasMap = {};
		const result = {
			named: {},
			array: []
		};

		Object.keys(flags).forEach((flag) => {
			const { alias, type = defaults.type, defaultValue = defaults.value[type], transform = defaults.transform[type] } = flags[flag];

			result.named[flag] = transform(defaultValue);

			if(typeof alias === 'string') aliasMap[alias] = flag;

			if(alias instanceof Array) alias.forEach((alias) => { aliasMap[alias] = flag });
		});

		argi.aliasMap = aliasMap;

		function parseFlag(flag, args){
			let flagConfig = flags[flag];

			if(!flagConfig){
				if(!aliasMap[flag]) return result.array.push(flag);

				flag = aliasMap[flag];
				flagConfig = flags[flag];
			}

			const { type = defaults.type, defaultValue = defaults.value[type], transform = defaults.transform[type] } = flagConfig;
			let value;

			if(type === 'boolean'){
				value = { true: true, false: false }[args[0]];

				if(typeof value === 'undefined') value = !defaultValue;

				else args.shift();
			}

			else if(!args[0] || args[0][0] === '-') value = defaultValue;

			else value = args.shift();

			result.named[flag] = transform(value);
		}

		function parseArg(argsArr){
			let arg = argsArr.shift();

			if(arg[0] === '-'){
				if(arg[1] === '-') parseFlag(arg.slice(2), argsArr);

				else arg.slice(1).split('').forEach((letter) => { parseFlag(letter, argsArr); });
			}

			else result.array.push(arg);

			if(argsArr.length) parseArg(argsArr);
		}

		parseArg(Array.from(process.argv).slice(2).join('=').split('='));

		argi.options = result;

		if(result.named.help){
			console.log('Help', flags);

			Object.keys(flags).forEach((flag) => {
				const { alias, type = defaults.type, defaultValue = defaults.value[type], transform = defaults.transform[type] } = flags[flag];

				const flagText = [flag].concat(alias).map((alias) => { return `${alias.length > 1 ? '--' : '-'}${alias}`; }).join(', ');

				console.log(`${flagText}\n\t[${type} :: ${defaultValue}]\n`);
			});

			process.kill(process.pid, 'SIGTERM');
		}

		return argi;
	}
};