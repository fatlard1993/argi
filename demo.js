/* eslint-disable spellcheck/spell-checker */
import Argi from './src/argi';

const argi = new Argi({
	// Uncomment to change default versionText
	// versionText: 'VERSION: 9001',

	// Uncomment to change default usageText
	// usageText: 'Example: argi get jim@dundermifflin.com --number 30 ./folder/fileA ./folder/fileB',

	parse: false, // Parsing immediately is the default behavior, but it can also be disabled and manually invoked at any time

	helpText: `This is a test of your emergency preparedness systems. Please do not be alarmed!\n\n--------------------------`,
	defaults: {
		// Uncomment to remove default help behavior
		// config: { help: undefined },

		transform: {
			csv: value => value.split(','),
		},
	},
	options: {
		__subCommands: [
			{
				name: 'operation',
				required: true,
				test: value => /get|set/.test(value) || `"${value}" is not a supported operation .. Use "get" or "set"`,
				variableName: 'get|set',
			},
			{
				name: 'notification',
				description: 'Email to send notification on operation completion',
				variableName: 'email',
			},
		],
		__tail: [
			{
				name: 'source',
				description: 'The source URI',
			},
			{
				name: 'files',
				rest: true,
				description: 'Any number of space separated target file paths',
				variableName: '...files',
			},
		],
		simpleString: {
			alias: 's',
			description: 'A simple string flag test',
		},
		stringArr: {
			description: 'A an array of strings provided with N flags',
			transform: value => (argi.options.str ? argi.options.str.concat(value) : [value]),
		},
		string: {
			defaultValue: 'default',
			alias: 'S',
			variableName: 'helpfulName',
			transform: value => value.toUpperCase(),
			description: 'A complex string flag test',
		},
	},
});

const { options } = argi.parse({
	number: {
		type: 'number',
		required: true,
		test: value => value > 10 || '--number requires a value greater than 10',
		alias: ['n', 'num'],
		description: 'A simple number flag test',
	},
	list: {
		type: 'csv',
		description: 'A simple csv list flag test',
	},
	bool: {
		type: 'boolean',
		description: 'A simple boolean flag test',
	},
	complexBoolean: {
		type: 'boolean',
		alias: ['c', 'B', 'cBool'],
		transform: value => `${value ? 'T' : 'Not t'}o be`,
		description: 'A complex boolean flag test',
	},
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
