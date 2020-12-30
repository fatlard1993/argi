#!/usr/bin/env node

console.log('ARGV', process.argv);

const argi = require('../src/index').parse({
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
});

console.log('Alias Map', argi.aliasMap);

console.log('Options', argi.options);