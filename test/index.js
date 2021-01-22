#!/usr/bin/env node

console.log('ARGV', process.argv);

const argi = require('../src/index')

// Uncomment to remove default help behavior
// delete argi.defaults.flags.help;

argi.parse({
	simpleString: {
		type: 'string',
		alias: ['s'],
		description: 'A simple string flag test'
	},
	string: {
		type: 'string',
		defaultValue: 'default',
		alias: ['S'],
		transform: (value) => { return value.toUpperCase(); },
		description: 'A complex string flag test'
	},
	number: {
		type: 'string',
		alias: ['n'],
		defaultValue: 1,
		transform: (value) => { return Number(value); },
		description: 'A simple string flag test'
	},
	bool: {
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

console.log('Alias Map', argi.aliasMap);

console.log('Options', argi.options);