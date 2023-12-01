module.exports = {
	comments: true,
	strings: true,
	identifiers: true,
	templates: true,
	lang: 'en_US',
	skipWords: ['ecma', 'compat', 'eslintrc', 'multiline', 'builtins', 'cjs', 'globals', 'argv', 'argi'],
	skipIfMatch: ['\\d+v[wh]'],
	skipWordIfMatch: [],
	minLength: 1,
};
