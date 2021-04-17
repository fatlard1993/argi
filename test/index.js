#!/usr/bin/env node

const argi = require('../src/index');

// Uncomment to remove default help behavior
// delete argi.defaults.flags.help;

// Uncomment to change default versionText
// argi.versionText = 'VERSION: 9001';

argi.helpText = `This is a test of your emergency preparedness systems. Please do not be alarmed!\n\n--------------------------`;

argi.defaults.transform.csv = (value) => { return value.split(','); };

argi.registerOptions({
	__subCommands: [
		{
			name: 'operation',
			required: true,
			test: (value) => { return /get|set/.test(value) || `"${value}" is not a supported operation .. Use "get" or "set"`; },
			description: 'Get or set the things'
		},
		{
			name: 'force',
			description: 'Force the operation'
		}
	],
	__tail: [
		{
			name: 'source',
			description: 'The source file path'
		},
		{
			name: 'files',
			rest: true,
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
	}
});

const { options } = argi.parse({
	number: {
		type: 'number',
		required: true,
		test: (value) => { return value > 10 || '--number requires a value greater than 10'; },
		alias: ['n', 'num'],
		description: 'A simple number flag test'
	},
	list: {
		type: 'csv',
		description: 'A simple csv list flag test'
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

// Uncomment for a simple test
// const { options } = argi.parse({
// 	str: {
// 		alias: 's'
// 	},
// 	num: {
// 		type: 'number',
// 		alias: 'n'
// 	},
// 	bool: {
// 		type: 'boolean',
// 		alias: 'b'
// 	}
// });

console.log('Passthrough Args', argi.passThrough);
console.log('Unparsed Args', argi.argArray);
console.log('Options', options);