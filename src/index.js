#!/usr/bin/env node

console.log('ARGV', process.argv);

const options = {
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
		}
	},
	flags: {
		double: {
			type: 'string',
			defaultValue: 'default',
			transform: (value) => { return value.toUpperCase(); },
			description: 'A double dash flag test'
		},
		single: {
			defaultValue: false,
			alias: ['s', 'i', 'n', 'g', 'l', 'e'],
			transform: (value) => { return value ? 'yes' : 'probably not'; },
			description: 'A single dash flag test'
		}
	}
};

const { defaults, flags } = options;

//todo implementer configuration

//todo consider other types, maybe use the type as a default transform? (eg. Number)

//todo what to do with flags that are defined multiple times? (eg: -vvv)

//todo support "=" (eg. --param=value)

//todo help text printout (description, alias, and default)
	//todo support overriding help text functionality

//todo version printout?
	//todo support overriding version functionality

let aliasMap = {};

Object.keys(flags).forEach((flag) => {
	const alias = flags[flag].alias;

	if(!alias) return;

	if(typeof alias === 'string') return aliasMap[alias] = flag;

	if(!alias.forEach) return;

	alias.forEach((letter) => { aliasMap[letter] = flag });
});

console.log('aliasMap', aliasMap);

const result = {
	named: {},
	array: []
};

function parseFlag(flag, args){
	console.log('Parse flag: ', flag);

	let flagConfig = flags[flag]

	if(!flagConfig){
		if(!aliasMap[flag]) return result.array.push(flag);

		flag = aliasMap[flag];
		flagConfig = flags[flag];
	}

	const { type = defaults.type, defaultValue = defaults.value[type], transform = defaults.transform[type] } = flagConfig;
	let value = !args[0] || args[0][0] === '-' ? defaultValue : args[0];

	if(typeof value === 'undefined' && type === 'boolean'){
		value = { true: true, false: false }[args[0]];

		if(typeof value === 'undefined') value = true;
		else args.shift();
	}

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

parseArg(Array.from(process.argv).slice(2));

console.log('Loaded Arguments: ', result);

module.exports = result;