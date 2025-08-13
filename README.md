# argi

Lightweight, zero-dependency CLI argument parser for Node.js with three-tier argument system.

**Key Features:**

- 🪶 **18KB, zero dependencies** - Smaller than alternatives, no security risks
- ⚡ **Three-tier parsing** - Sub commands, flags, and tail arguments
- 🎯 **Type-safe** - Built-in validation and type conversion
- 🎨 **Auto-generated help** - Beautiful colored terminal output
- 🔧 **Extensible** - Custom types, transforms, and validation

**Bundle Comparison:**

```
Argi:         ~18 KB
Commander:    ~25 KB  (29% larger)
Yargs:       ~200 KB  (11x larger!)
Minimist:     ~5 KB   (minimal features)
```

## Quick Start

```bash
npm i fatlard1993/argi
```

```javascript
import Argi from 'argi';

const argi = new Argi({
	options: {
		name: {
			alias: 'n',
			description: 'Your name',
			required: true,
		},
		verbose: {
			type: 'boolean',
			alias: 'v',
			description: 'Enable verbose output',
		},
	},
});

console.log(argi.options);
// Usage: node script.js --name John --verbose
// Result: { name: 'John', verbose: true }
```

## Three-Tier Argument System

Argi processes arguments in three distinct phases:

```bash
your-cli [subcommand] [subcommand2] --flag value -v file1.txt file2.txt
         └─ Sub Commands ─┘         └─ Flags ─┘  └─ Tail Arguments ─┘
```

### Sub Commands

Positional arguments that define actions. Processed first.

```bash
git clone https://github.com/user/repo  # 'clone' is a sub command
```

### Flags

Named arguments with `-` or `--` prefix. Configure behavior.

```bash
git clone --depth 1 -v  # '--depth' and '-v' are flags
```

### Tail Arguments

Positional arguments after flags. Usually files or targets.

```bash
cp file1.txt file2.txt /destination/  # Files are tail arguments
```

## Complete Examples

### Basic CLI Tool

```javascript
import Argi from 'argi';

const argi = new Argi({
	helpText: 'Simple greeting tool',
	options: {
		name: {
			alias: 'n',
			description: 'Name to greet',
			required: true,
		},
		times: {
			type: 'number',
			alias: 't',
			defaultValue: 1,
			description: 'Number of greetings',
			test: val => val > 0 || 'Must be positive',
		},
		uppercase: {
			type: 'boolean',
			alias: 'u',
			description: 'Convert to uppercase',
		},
	},
});

let greeting = `Hello, ${argi.options.name}!`;
if (argi.options.uppercase) greeting = greeting.toUpperCase();

for (let i = 0; i < argi.options.times; i++) {
	console.log(greeting);
}
```

Usage:

```bash
node greet.js --name Alice
node greet.js -n Bob --times 3 --uppercase
node greet.js --help  # Auto-generated help
```

### Sub Commands Example

```javascript
const argi = new Argi({
	helpText: 'File management utility',
	options: {
		__subCommands: [
			{
				name: 'command',
				required: true,
				test: val => ['copy', 'move', 'delete'].includes(val) || 'Command must be copy, move, or delete',
				description: 'Operation to perform',
			},
		],
		source: {
			alias: 's',
			description: 'Source file or directory',
			required: true,
		},
		destination: {
			alias: 'd',
			description: 'Destination path',
		},
		force: {
			type: 'boolean',
			alias: 'f',
			description: 'Force operation',
		},
	},
});

const { command, source, destination, force } = argi.options;

switch (command) {
	case 'copy':
		console.log(`Copying ${source} to ${destination}`);
		break;
	case 'move':
		console.log(`Moving ${source} to ${destination}`);
		break;
	case 'delete':
		if (!force) console.log('Add --force to confirm');
		else console.log(`Deleting ${source}`);
		break;
}
```

Usage:

```bash
node fileutil.js copy --source ./docs --destination ./backup
node fileutil.js move -s old.txt -d new.txt
node fileutil.js delete --source temp/ --force
```

### Tail Arguments Example

```javascript
const argi = new Argi({
	helpText: 'Process multiple files',
	options: {
		format: {
			type: 'string',
			alias: 'f',
			defaultValue: 'json',
			test: val => ['json', 'csv', 'xml'].includes(val) || 'Format must be json, csv, or xml',
		},
		config: {
			type: 'json',
			alias: 'c',
			description: 'Processing configuration as JSON',
		},
		__tail: [
			{
				name: 'files',
				rest: true,
				description: 'Files to process',
			},
		],
	},
});

const { format, config, files } = argi.options;

console.log(`Processing ${files.length} files in ${format} format`);
if (config) console.log('Using config:', config);

files.forEach(file => console.log(`Processing: ${file}`));
```

Usage:

```bash
node process.js --format csv file1.txt file2.txt file3.txt
node process.js -c '{"minSize": 1024}' *.log
```

## API Reference

### Constructor Options

```javascript
new Argi({
	helpText: string, // Custom help text
	usageText: string, // Custom usage text (auto-generated)
	versionText: string, // Custom version text (uses package.json)
	packageJSON: object, // Custom package.json object
	options: object, // Argument configuration
	parse: boolean, // Parse immediately (default: true)
});
```

### Option Properties

#### All Arguments

| Property       | Type       | Description                            |
| -------------- | ---------- | -------------------------------------- |
| `type`         | `string`   | Data type (see Built-in Types)         |
| `description`  | `string`   | Help text description                  |
| `required`     | `boolean`  | Whether argument is required           |
| `defaultValue` | `any`      | Default value if not provided          |
| `transform`    | `function` | Custom transform: `(value) => result`  |
| `test`         | `function` | Validation: `(value) => true \| error` |

#### Flags Only

| Property       | Type               | Description               |
| -------------- | ------------------ | ------------------------- |
| `alias`        | `string\|string[]` | Short names (e.g., `'v'`) |
| `variableName` | `string`           | Display name in help      |

#### Sub Commands & Tail Arguments Only

| Property | Type      | Description                               |
| -------- | --------- | ----------------------------------------- |
| `name`   | `string`  | **Required** - Key name in options object |
| `rest`   | `boolean` | _(Tail only)_ Capture remaining as array  |

### Built-in Types

| Type        | Description            | Input Example             | Output                   |
| ----------- | ---------------------- | ------------------------- | ------------------------ |
| `'string'`  | Default, no conversion | `--name "John"`           | `"John"`                 |
| `'number'`  | JavaScript number      | `--count 42`              | `42`                     |
| `'boolean'` | True/false flags       | `--verbose`, `--no-debug` | `true`, `false`          |
| `'integer'` | Digits only            | `--port 8080`             | `8080`                   |
| `'json'`    | Parse JSON strings     | `--config '{"x":1}'`      | `{x: 1}`                 |
| `'csv'`     | Split on commas        | `--tags red,green,blue`   | `['red','green','blue']` |

## Common Patterns

### Custom Validation

```javascript
const argi = new Argi({
	options: {
		port: {
			type: 'number',
			test: val => (val >= 1 && val <= 65535) || 'Port must be 1-65535',
		},
		email: {
			test: val => /\S+@\S+\.\S+/.test(val) || 'Invalid email format',
		},
	},
});
```

### Custom Types

```javascript
const argi = new Argi({
	defaults: {
		transform: {
			list: val => val.split(',').map(s => s.trim()),
		},
	},
	options: {
		items: {
			type: 'list',
			description: 'Comma-separated list',
		},
	},
});
// Usage: --items "apple, banana, cherry"
// Result: ['apple', 'banana', 'cherry']
```

### Environment Fallbacks

```javascript
const argi = new Argi({
	options: {
		apiKey: {
			defaultValue: process.env.API_KEY,
			required: !process.env.API_KEY,
			description: 'API key (or set API_KEY env var)',
		},
	},
});
```

## Error Handling

### Automatic (Default)

```javascript
const argi = new Argi({
	options: {
		required: { required: true },
		validated: { test: val => val.length > 5 || 'Must be > 5 chars' },
	},
});
// Exits process on validation errors
```

### Manual

```javascript
const argi = new Argi({
	parse: false,
	options: {
		/* config */
	},
});

try {
	argi.parse();
	console.log('Success:', argi.options);
} catch (error) {
	console.error('Failed:', error.message);
	process.exit(1);
}
```

## Troubleshooting

**Missing value errors:**

```bash
# Wrong: flag without value
node script.js --output --verbose

# Correct: provide value or use boolean type
node script.js --output ./results --verbose
```

**Spaces in arguments:**

```bash
# Use quotes
node script.js --message "Hello, World!"
```

**--no-prefix not working:**

```javascript
// Flag must be defined for --no- prefix to work
{
	debug: {
		type: 'boolean';
	}
} // Now --no-debug works
```

**Debug parsing:**

```javascript
console.log('Raw args:', process.argv.slice(2));
console.log('Parsed options:', argi.options);
```

## Migration from Other Libraries

**From Commander.js:**

```javascript
// Commander
program.option('-v, --verbose', 'verbose output').option('-p, --port <number>', 'port number', 3000);

// Argi
const argi = new Argi({
	options: {
		verbose: { type: 'boolean', alias: 'v', description: 'verbose output' },
		port: { type: 'number', alias: 'p', defaultValue: 3000, description: 'port number' },
	},
});
```

**From Yargs:**

```javascript
// Yargs
const argv = yargs.option('verbose', { type: 'boolean', alias: 'v' }).demandOption(['name']).argv;

// Argi
const argi = new Argi({
	options: {
		verbose: { type: 'boolean', alias: 'v' },
		name: { required: true },
	},
});
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
