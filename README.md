# argi

Like "args", but better because it uses "i" to pluralize.

Just a simple arguments parser for node.js that attempts to implement only the minimum necessities. Intended for use in more complex implementations where less assumptions are better and more ability for configuration is valued. Also great for small projects where size matters.

your-cool-project/ $ `npm i fatlard1993/argi`

```
const argi = require('argi');

argi.parse({
	stringFlag: {
		defaultValue: 'default string content',
		alias: 's',
		transform: (value) => { return value.toUpperCase(); },
		description: 'A string flag'
	},
	booleanFlag: {
		type: 'boolean',
		alias: ['b', 'bool],
		description: 'A boolean flag'
	}
});

console.log(argi.options);
```

`argi` outputs an `options` object which is created from cli arguments defined as 3 distinct types:
* Sub Commands
* Flags
* Tail Arguments


## Configurable Properties

Each option config object, regardless of type, can have any combination of the base `5` properties:
* `type`
* `transform`
* `description`
* `required`
* `test`

Flags supports `2` additional properties:
* `alias`
* `variableName`


Sub commands and tail arguments have one required property `name`, which defines the key for the options object output.
Being arrays they also have an implicit order:
```
...
argi.parse({
	__subCommands: [
		{ name: 'one' },
		{ name: 'two' }
	],
	__tail: [
		{ name: 'three' }
	]
});
...
```
$ `your-cool-project one two three`

Tail arguments support `1` additional property:
* `rest`


### Data Types: `type` and `transform`

Data types are used to enforce a native type, and format (via a `transform` function).

There are `5` default types to choose from (though you can easily add many more, [see below](### Change defaults)):
* 'string'
* 'number'
* 'int'
* 'float'
* 'boolean'


#### String: `string`

String is the default type for all flags, so it does not require an explicit `type` definition.

```
...
argi.parse({
	foo: {
		transform: (value) => { return value.toUpperCase(); }
	}
});
...
```

Each `type` has a default `transform` function, but if one is provided here the default will be overridden.

`--foo='a string'`


#### Number: `number`, `int`, `float`

```
...
argi.parse({
	foo: {
		type: 'number'
	}
});
...
```

`--foo 9001`

#### Boolean: `boolean`

```
...
argi.parse({
	foo: {
		type: 'boolean',
		alias: 'f'
	},
	bar: {
		type: 'boolean',
		alias: 'b'
	}
});
...
```

`-fb`

A boolean can also be prefixed with `--no-` or `--no` to invert the assertion:

`--no-foo`


### Descriptors: `description` and `variableName`

The description is used to provide users with a descriptive bit of text to explain the flag in the help printout.
Flags support one additional property: `variableName` which defaults to the `type` and provides context for the flag variable in the help printout.

```
...
argi.parse({
	foo: {
		description: 'Not bar',
		variableName: 'Something more helpful than "string"'
	},
	bar: {
		defaultValue: 'baz',
		type: 'boolean'
	}
});
...
```

```
$ my-cool-program --help

[my-cool-program] Version: 0.1.0

Usage:

my-cool-program [[--help|-h] | [--version] | [--foo <Something more helpful than "string">] | [--bar]]


Flags:

--help, -h
	[boolean]

--version
	[boolean]

--foo
	[Something more helpful than "string"]
	Not bar

--bar
	[boolean :: baz]
```


### Required: `required`

If a required option is not provided the program will exit with an error.

```
...
argi.parse({
	foo: {
		required: true
	}
});
...
```


### Test: `test`

The test function provides a way to validate the value a user has provided.

```
...
argi.parse({
	foo: {
		test: (value) => { return value !== 'bar'; }
	}
});
...
```

### Flag Aliases: `alias`

An alias is used to provide an alternative (typically shorthand) flag name
```
...
argi.parse({
	foo: {
		alias: 'f'
	}
});
...
```
`--foo` == `-f`


Multiple aliases can be provided as well:
```
...
argi.parse({
	foo: {
		alias: ['f', 'oo']
	}
});
...
```
`--foo` == `-f` == `--oo`


### Tail Argument `rest` Property

Tail arguments support one special property `rest` which will cause the output value to be an array of all remaining tail arguments.

```
...
argi.parse({
	__tail: [
		{
			name: 'files',
			description: 'An array of all the files',
			rest: true
		}
	]
});
...
```

$ `my-cool-program thisFile.ext thatFile.ext /thisPath/with/a/file.ext`


## Sub Commands: `__subCommands`

Sub commands are space delineated words *not* prefixed with `-`

They precede any flags or tail args, eg: `your-cool-project subCommand --flag tailArg`

```
...
argi.parse({
	__subCommands: [
		{
			name: 'operation',
			required: true,
			test: (value) => { return /get|set/.test(value) || `"${value}" is not a supported operation .. Use "get" or "set"`; },
			description: 'Get or set the things'
		}
	]
});
...
```


## Flags

Flags are cli arguments preceded by `-`, eg: `--foo` or `-b`

Single letter flags are preceded by one `-` and can be combined with other single letter flags, eg: `-fb` == `-f` AND `-b`

Flags with more than one letter are preceded by two `-`'s, eg: `--foo`
```
...
argi.parse({
	foo: {
		type: 'boolean',
		alias: 'f'
	},
	bar: {
		type: 'boolean',
		alias: 'b'
	}
});
...
```


### Tail Arguments: `__tail`

Tail arguments are space delineated words *not* prefixed with `-`.
Exactly the same as subCommands, wit


## Options: `argi.options`

The output of the parse operation is stored in `argi.options`.

```
...
argi.parse({
	foo: {
		description: 'Not bar',
		variableName: 'Something more helpful than "string"'
	},
	bar: {
		defaultValue: 'baz',
		type: 'boolean'
	}
});

console.log('Options: ', argi.options);
...
```

```
$ my-cool-program --foo bar

Options: { foo: 'bar', bar: 'baz' }
```


## Change defaults

Disable the builtin help:
```
const argi = require('argi');

delete argi.defaults.flags.help;

argi.parse(...
```

Change the default type:
```
const argi = require('argi');

argi.defaults.type = 'boolean';

argi.parse(...
```

Change the default transform functions:
```
const argi = require('argi');

argi.defaults.transform.string =  (value) => { return value.toLowerCase(); }

argi.parse(...
```

Add a custom type:
```
const argi = require('argi');

argi.defaults.value.array = '[]';
argi.defaults.transform.array = function(value){ return JSON.parse(value); };

argi.parse(...
```

Change the default version text:
(Same for helpText & usageText)
```
const argi = require('argi');

argi.versionText = 'VERSION: 9001';

argi.parse(...
```

Change the default exit behavior:
```
const argi = require('argi');

argi.exit = console.log.bind(null, 'Just keep swimming');

argi.parse(...
```