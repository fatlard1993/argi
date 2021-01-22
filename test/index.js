#!/usr/bin/env node

console.log('ARGV', process.argv);

const argi = require('../src/index')

// Uncomment to remove default help behavior
// delete argi.defaults.flags.help;

argi.defaults.value.array = '[]';
argi.defaults.transform.array = function(value){ return JSON.parse(value); };

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
		type: 'number',
		alias: ['n'],
		description: 'A simple number flag test'
	},
	array: {
		type: 'array',
		description: 'A simple array flag test'
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