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
			boolean: (value) => { return value; }
		},
		flags: {
			help: {
				alias: ['h'],
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

		if(argi.defaults.flags.help && result.named.help){
			console.log('Help', flags);

			Object.keys(flags).forEach((flag) => {
				let { alias, description = '', type = defaults.type, defaultValue = defaults.value[type] } = flags[flag];

				alias = [flag].concat(alias).map((alias) => { return `${alias.length > 1 ? '--' : '-'}${alias}`; }).join(', ');

				if(description.length) description = `\t${description}\n`;

				console.log(`${alias}\n\t[${type} :: ${defaultValue}]\n${description}`);
			});

			process.kill(process.pid, 'SIGTERM');
		}

		return argi;
	}
};