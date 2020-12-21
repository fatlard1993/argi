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
		string: {
			type: 'string',
			defaultValue: 'default',
			alias: ['s'],
			transform: (value) => { return value.toUpperCase(); },
			description: 'A string flag test'
		},
		boolean: {
			alias: ['b'],
			description: 'A simple boolean flag test'
		},
		complexBoolean: {
			type: 'boolean',
			alias: ['c', 'B', 'cBool'],
			defaultValue: false,
			transform: (value) => { return `${value ? 'T' : 'Not t'}o be`; },
			description: 'A complex boolean flag test'
		}
	}
};

const { defaults, flags } = options;

//todo implementer configuration

//todo consider other types, maybe use the type as a default transform? (eg. Number)

//todo what to do with flags that are defined multiple times? (eg: -vvv)

//todo put the default values for undefined flags in the output

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

	let value;

	if(/=/.test(flag)){
		flag = flag.split('=');
		value = flag[1];
		flag = flag[0];
	}

	let flagConfig = flags[flag];

	if(!flagConfig){
		if(!aliasMap[flag]) return result.array.push(flag);

		flag = aliasMap[flag];
		flagConfig = flags[flag];
	}

	const { type = defaults.type, defaultValue = defaults.value[type], transform = defaults.transform[type] } = flagConfig;

	if(typeof value === 'undefined'){
		if(!args[0] || args[0][0] === '-') value = defaultValue;

		else if(type === 'boolean'){
			value = { true: true, false: false }[args[0]];

			if(typeof value === 'undefined') value = defaultValue;

			else args.shift();
		}

		else value = args.shift();
	}

	result.named[flag] = transform(value);
}

function parseArg(argsArr){
	let arg = argsArr.shift();

	if(arg[0] === '-'){
		if(arg[1] === '-') parseFlag(arg.slice(2), argsArr);

		else{
			if(/=/.test(arg)){
				arg = arg.split('=');

				const value = arg[1];

				arg = arg[0];

				arg[arg.length - 1] = `${arg[arg.length - 1]}=${value}`;
			}

			else arg = arg.slice(1).split('');

			arg.forEach((letter) => { parseFlag(letter, argsArr); });
		}
	}

	else result.array.push(arg);

	if(argsArr.length) parseArg(argsArr);
}

parseArg(Array.from(process.argv).slice(2));

console.log('Loaded Arguments: ', result);

module.exports = result;