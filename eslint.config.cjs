const globals = require('globals');
const { fixupPluginRules } = require('@eslint/compat');
const js = require('@eslint/js');
const jsdoc = require('eslint-plugin-jsdoc');

const importPlugin = require('eslint-plugin-import');
const spellcheck = require('eslint-plugin-spellcheck');
const testingLibrary = require('eslint-plugin-testing-library');
const unicorn = require('eslint-plugin-unicorn');
const writeGoodComments = require('eslint-plugin-write-good-comments');

module.exports = [
	{
		ignores: ['**/node_modules'],
	},
	js.configs.recommended,
	jsdoc.configs['flat/recommended'],
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: globals.builtin,
		},
	},
	{
		files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
		plugins: {
			import: importPlugin,
			'write-good-comments': writeGoodComments,
			spellcheck,
			unicorn,
		},
		languageOptions: {
			globals: {
				...globals.node,
				Bun: false,
			},
		},
		rules: {
			'no-console': 'warn',
			'no-nested-ternary': 'error',
			'no-var': 'error',
			'prefer-const': 'error',
			'comma-dangle': ['error', 'only-multiline'],
			'no-async-promise-executor': 'off',
			'no-prototype-builtins': 'off',

			'unicorn/filename-case': 'off',
			'unicorn/no-null': 'off',
			'unicorn/no-await-expression-member': 'off',
			'unicorn/no-array-for-each': 'off',
			'unicorn/prefer-spread': 'off',
			'unicorn/no-negated-condition': 'off',
			'unicorn/no-array-reduce': 'off',
			'unicorn/no-array-callback-reference': 'off',
			'unicorn/prefer-query-selector': 'off',
			'unicorn/prefer-node-protocol': 'off',
			'unicorn/no-this-assignment': 'off',
			'unicorn/consistent-function-scoping': 'off',
			'unicorn/numeric-separators-style': 'off',
			'unicorn/prefer-switch': 'off',
			'unicorn/prefer-dom-node-dataset': 'off',
			'unicorn/prefer-global-this': 'off',
			'unicorn/import-style': 'off',

			// TODO This rule doesn't work after updating to eslint 9
			// https://github.com/import-js/eslint-plugin-import/pull/2829
			// 'import/no-unused-modules': [1, { unusedExports: true }],

			'import/no-unresolved': [1, { ignore: ['bun', 'bun:test', String.raw`\.asText$`] }],
			'import/no-useless-path-segments': 'error',
			'import/first': 'warn',
			'import/order': 'warn',

			'write-good-comments/write-good-comments': 'warn',

			'spellcheck/spell-checker': ['warn', require('./spellcheck.config.cjs')],
		},
	},
	{
		files: ['test-setup.js', '**/*.test.js'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.jest,
				Bun: false,
				container: false,
				mock: true,
				spyOn: true,
				setSystemTime: true,
			},
		},
		plugins: {
			'testing-library': fixupPluginRules({ rules: testingLibrary.rules }),
		},
		rules: {
			...testingLibrary.configs.dom.rules,
			'no-console': 'off',
			'testing-library/prefer-screen-queries': 'off',
		},
	},
];
