# argi

Like "args", but better because it uses "i" to pluralize.

Just a simple arguments parser for node.js that attempts to implement only the minimum necessities. Intended for use in more complex implementations where less assumptions are better and more ability for configuration is valued. Also great for small projects where size matters.

## Usage

your-cool-project/ $ `npm i fatlard1993/argi`

```
const argi = require('argi');

argi.parse({
	stringFlag: {
		type: 'string',
		defaultValue: 'default string content',
		alias: 's',
		transform: (value) => { return value.toUpperCase(); },
		description: 'A string flag'
	},
	booleanFlag: {
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

argi.defaults.type = 'string';

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