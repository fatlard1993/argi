# argi

Like "args", but better because it uses "i" to pluralize.

Just a simple arguments parser for node.js that attempts to implement only the minimum necessities. Intended for use in more complex implementations where less assumptions are better and more ability for configuration is valued. Also great for small projects where size matters.


## Aliases: `alias`

An alias is used to provide an alternative (typically shorthand) flag name.
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


## Data Types: `type` and `transform`

Data types are used to enforce a native type, and format (via a `transform` function).

There are `5` default types to choose from (though you can easily add many more, [see below](### Change defaults)):
* 'string'
* 'number'
* 'int'
* 'float'
* 'boolean'


### String: `string`

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


### Number: `number`, `int`, `float`

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

### Boolean: `boolean`

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

A boolean can also be prefixed with `--no-` to invert the assertion:

`--no-foo`


## Descriptors: `description` and `variableName`

The description is used to provide users with a descriptive bit of text to explain the flag in the help printout.

```
...
argi.parse({
	foo: {
		description: 'Not bar',
		variableName: 'Something more helpful than "string"'
	},
	bar: {
		type: 'boolean'
	}
});
...
```

```
$ <my-cool-program> --help

TODO - add help printout
```


## Usage

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
		description: 'A simple boolean flag'
	}
});

console.log(argi.options);
```

### Change defaults

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