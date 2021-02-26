#!/usr/bin/env node

const argi = require('../src/index')

// Uncomment to remove default help behavior
// delete argi.defaults.flags.help;

argi.helpText = `This is a test of your emergency preparedness systems. Please do not be alarmed!\n\n--------------------------`;

// Uncomment to change default versionText
// argi.versionText = 'VERSION: 9001';

// Uncomment to enable strict mode
argi.strict = true;

argi.defaults.value.array = '[]';
argi.defaults.transform.array = function(value){ return JSON.parse(value); };

argi.parse2({
	__subCommands: [
		{
			key: 'get|set',
			name: 'operation',
			description: 'Get or set the things'
		},
		{
			key: 'force',
			description: 'Force the operation'
		}
	],
	__tail: [
		{
			key: '...files',
			name: 'files',
			description: 'Any number of space separated target file paths'
		}
	],
	simpleString: {
		alias: 's',
		description: 'A simple string flag test'
	},
	string: {
		defaultValue: 'default',
		alias: 'S',
		variableName: 'helpfulName',
		transform: (value) => { return value.toUpperCase(); },
		description: 'A complex string flag test'
	},
	number: {
		type: 'number',
		required: true,
		alias: ['n', 'num'],
		description: 'A simple number flag test'
	},
	array: {
		type: 'array',
		description: 'A simple array flag test'
	},
	bool: {
		type: 'boolean',
		description: 'A simple boolean flag test'
	},
	complexBoolean: {
		type: 'boolean',
		alias: ['c', 'B', 'cBool'],
		defaultValue: true,
		transform: (value) => { return `${value ? 'T' : 'Not t'}o be`; },
		description: 'A complex boolean flag test'
	}
});

// console.log('Arg Array', argi.array);

// console.log('Alias Map', argi.aliasMap);

console.log('Options', argi.options);

// console.log('ARGV', argi.argv);