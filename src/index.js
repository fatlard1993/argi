#!/usr/bin/env node

const argi = module.exports = {
	defaults: {
		type: 'boolean',
		value: {
			string: '',
			boolean: true
		},
		transform: {
			string: (value) => { return value; },
			boolean: (value) => {
				value = { true: true, false: false }[value];

				return typeof value === 'undefined' ? true : value;
			}
		},
		flags: {
			help: {
				defaultValue: false,
				alias: ['h']
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

			if(!alias) return;

			if(typeof alias === 'string') return aliasMap[alias] = flag;

			if(!alias.forEach) return;

			alias.forEach((letter) => { aliasMap[letter] = flag });
		});

		argi.aliasMap = aliasMap;

		function parseFlag(flag, args){
			// console.log('Parse flag: ', flag);

			let flagConfig = flags[flag];

			if(!flagConfig){
				if(!aliasMap[flag]) return result.array.push(flag);

				flag = aliasMap[flag];
				flagConfig = flags[flag];
			}

			const { type = defaults.type, defaultValue = defaults.value[type], transform = defaults.transform[type] } = flagConfig;
			let value;

			if(!args[0] || args[0][0] === '-') value = defaultValue;

			else if(type === 'boolean'){
				value = { true: true, false: false }[args[0]];

				if(typeof value === 'undefined') value = defaultValue;

				else args.shift();
			}

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

		return argi;
	}
};