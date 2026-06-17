# argi

A CLI argument parser built around one constraint: every argument is declared before it is parsed. Subcommands, flags, and tail arguments each get their own schema — argi walks `process.argv` against it and returns a typed object. Anything undeclared is an error.

Zero dependencies. ~22KB.

- Built-in types: `string`, `number`, `boolean`, `integer`, `json`, `csv` — coerced and validated automatically
- Colored `--help` output generated from your declarations, no extra setup
- Extensible: override any built-in type or add your own, globally or per-flag

## Philosophy

Most argument parsers accept what you give them. Unknown flags pass through silently. The boundary between what you declared and what the parser decided on your behalf is implicit.

The declaration requirement closes that boundary. When every argument is declared before it's parsed, every behavior in your argv handling is your code. Argi's job is to walk the schema against `process.argv` and return what matched. What to do with it stays yours.

Zero dependencies is the same rule applied to the library itself. Everything that executes when you call `new Argi()` is in this repository — there's no upstream chain to follow when something breaks.

The `.d.ts` is a structural compatibility shim for IDEs and bundlers, not a type contract. `options` is `Record<string, unknown>` because that's what the runtime returns. The source reads in one sitting.

## Installation

```bash
npm install argi-cli
# or
bun add argi-cli
```

## Quick Start

```javascript
import Argi from 'argi-cli';

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
```

```bash
$ node script.js --name John --verbose
{ name: 'John', verbose: true }
```

## How argi parses argv

Three argument kinds, declared explicitly — argi never infers which shape an argument belongs to, and never silently passes through undeclared input.

```bash
mycli [command] --flag value -v file1.txt file2.txt
      └─ cmd ─┘ └─── flags ──┘ └─ tail arguments ──┘
```

The command word is consumed first (if `commands` is declared), then flags in any order, then tail arguments.

### Flags

`-` or `--` prefixed arguments. Can appear in any order.

```bash
git clone --depth 1 -v  # '--depth' and '-v' are flags
```

### Tail Arguments

Positional arguments consumed after all flags — typically files or targets.

```bash
cp file1.txt file2.txt /destination/  # files are tail arguments
```

## Named Commands

For git-style dispatch — where each command has a distinct purpose and its own option schema — declare a `commands` map. The first word of argv is consumed as the command name; unknown words are an error.

```javascript
const argi = new Argi({
	helpText: 'Deploy tool',
	options: {
		verbose: { type: 'boolean', alias: 'v', description: 'Verbose output' },
	},
	commands: {
		deploy: {
			description: 'Deploy to an environment',
			options: {
				env: { required: true, description: 'Target environment' },
				dry: { type: 'boolean', description: 'Dry run' },
			},
		},
		rollback: {
			description: 'Roll back to a previous version',
			options: {
				version: { type: 'integer', required: true, description: 'Version to restore' },
			},
		},
	},
});

// node cli.js deploy --env production
// argi.command   → 'deploy'
// argi.options   → { verbose: undefined, env: 'production', dry: undefined }

// node cli.js rollback --version 3
// argi.command   → 'rollback'
// argi.options   → { verbose: undefined, version: 3 }
```

Global options (defined in the top-level `options`) are available to all commands. Command-specific options are only registered when that command is active. `--help` shows command-specific documentation when a command is present.

### Nested sub-commands

Declare `commands` inside a `CommandConfig` to nest sub-commands. Argi routes both levels in a single parse — no second instance needed.

```javascript
// node cli.js remote add --name origin
const argi = new Argi({
	commands: {
		remote: {
			description: 'Manage remotes',
			commands: {
				add: {
					description: 'Add a remote',
					options: { name: { required: true, description: 'Remote name' } },
				},
				remove: { description: 'Remove a remote' },
			},
		},
	},
});

// argi.command     → 'remote'
// argi.commandPath → ['remote', 'add']
// argi.options     → { name: 'origin' }
```

Nesting is unlimited — each `CommandConfig` can declare its own `commands`. Options from every level in the matched path are merged into `argi.options`. `argi.commandPath` holds the full matched sequence. `argi.command` is always `commandPath[0]`, kept for convenience with single-level commands.

`--help` at any depth shows the available sub-commands at that level and the flags active there.

## Examples

### Basic CLI Tool

```javascript
import Argi from 'argi-cli';

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

```bash
node greet.js --name Alice
node greet.js -n Bob --times 3 --uppercase
node greet.js --help  # Auto-generated help
```

### Tail Arguments Example

```javascript
const argi = new Argi({
	helpText: 'Process multiple files',
	tail: [
		{
			name: 'files',
			rest: true,
			description: 'Files to process',
		},
	],
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
	},
});

const { format, config, files } = argi.options;

console.log(`Processing ${files.length} files in ${format} format`);
if (config) console.log('Using config:', config);

files.forEach(file => console.log(`Processing: ${file}`));
```

```bash
node process.js --format csv file1.txt file2.txt file3.txt
node process.js -c '{"minSize": 1024}' *.log
```

## API Reference

### Constructor Options

```javascript
new Argi({
	helpText: string, // Custom help header (default: package.json description)
	usageText: string, // Custom usage line (default: auto-generated)
	versionText: string, // Custom version text (default: package.json version)
	packageJSON: object, // Custom package.json (default: auto-detected)
	defaults: object, // Override built-in types, transforms, tests, or built-in flags
	tail: array, // Positional arguments consumed after flags
	options: object, // Flag definitions
	commands: object, // Named command map (git-style dispatch)
	parse: boolean, // Parse on construction (default: true)
	argv: string[], // Custom args array (no node/script prefix); overrides process.argv
	remaining: boolean, // When true, collect unparsed args in this.remaining instead of erroring
});
```

**When to Override:**

- **`helpText`**: Add custom branding, detailed instructions, or examples
- **`usageText`**: Show specific command patterns or argument order requirements
- **`versionText`**: Include build info, commit hash, or custom versioning
- **`packageJSON`**: Testing, or when package.json isn't in expected location
- **`defaults`**: Add custom types, replace built-in transforms, or disable/replace `--help`/`--version`
- **`parse: false`**: Manual error handling, testing, or delayed parsing
- **`argv`**: Pass a custom token array instead of reading `process.argv` — useful for testing or composing nested parsers via `outer.remaining`
- **`remaining: true`**: Collect unparsed tokens in `this.remaining` instead of erroring — lets an outer parser forward leftovers to an inner one

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

| Property       | Type               | Description                                   |
| -------------- | ------------------ | --------------------------------------------- |
| `alias`        | `string\|string[]` | Short names (e.g., `'v'` or `['v', 'debug']`) |
| `variableName` | `string`           | Display name in help                          |

#### Tail Arguments Only

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

## Patterns

### Multiple Aliases

```javascript
const argi = new Argi({
	options: {
		verbose: {
			type: 'boolean',
			alias: ['v', 'verbose-mode', 'debug'],
			description: 'Enable verbose output',
		},
	},
});
```

```bash
node script.js --verbose-mode  # hyphenated alias
node script.js --debug         # alias that looks like a different flag
node script.js '--?'           # shell glob — requires quoting
```

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
// $ node script.js --items "apple, banana, cherry"
// items → ['apple', 'banana', 'cherry']
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

### Overriding Built-in Flags

`--help`, `--version`, `-h`, and `-?` are registered automatically. Pass `defaults.config` to override or disable any of them:

```javascript
const argi = new Argi({
	defaults: {
		config: {
			help: false,    // disables --help / -h / -?
			version: false, // disables --version
		},
	},
	options: { ... },
});
```

Set a key to `false` to remove the flag entirely. Set it to a `FlagConfig` object to replace the built-in with your own definition — useful when you want `--help` to do something custom rather than print and exit.

```javascript
// Replace --version with a flag that returns structured data instead of exiting
const argi = new Argi({
	defaults: {
		config: {
			version: { type: 'boolean', description: 'Print version' },
		},
	},
	options: { ... },
});

if (argi.options.version) console.log(JSON.stringify({ version: '1.0.0' }));
```

Setting `help: false` is common when argi is used as a sub-parser and the parent CLI owns help output.

## Error Handling

### Automatic (Default)

By default, argi catches its own errors — prints a formatted message to stderr and exits with code `1`. Your code only runs if parsing succeeded.

```javascript
const argi = new Argi({
	options: {
		name: { required: true },
		port: { type: 'number', test: val => (val > 0 && val < 65536) || 'Port must be 1-65535' },
	},
});
```

```
$ node script.js --port 99999
Error: Port must be 1-65535

$ node script.js
Error: Required option "name" is missing
Usage: script --name <value>
Help:  script --help
```

### Manual

With `parse: false`, calling `argi.parse()` throws `ArgiExit` instead of calling `process.exit()` — useful when you need to handle errors yourself or test without mocking process.

```javascript
import Argi, { ArgiExit } from 'argi-cli';

const argi = new Argi({
	parse: false,
	options: {
		name: { required: true },
	},
});

try {
	argi.parse();
	console.log('Success:', argi.options);
} catch (error) {
	if (error instanceof ArgiExit) {
		// error.code: 0 = help/version, 1 = validation error
		process.exit(error.code);
	}
	throw error;
}
```

## Pass-Through Arguments

`--` stops argi from parsing the rest of argv. Everything after it lands in `argi.passThrough` as a raw array — useful when your CLI wraps another tool and needs to forward arguments unchanged.

```javascript
const argi = new Argi({
	options: {
		verbose: { type: 'boolean', alias: 'v' },
	},
});

console.log(argi.options.verbose); // true
console.log(argi.passThrough);     // ['--config', 'app.yml', '--port', '3000']
```

```bash
node script.js --verbose -- --config app.yml --port 3000
```

## Shell Completions

Argi ships a completion protocol for bash, zsh, and fish. Two pieces: a setup script your CLI can print, and the `--_completions` query flag it answers automatically.

### Wiring up completions

Add a flag or command that calls `argi.printCompletions(shell)`:

```javascript
const argi = new Argi({
	options: {
		completions: {
			type: 'string',
			description: 'Print shell completion setup (bash, zsh, or fish)',
		},
	},
});

if (argi.options.completions) argi.printCompletions(argi.options.completions);
```

```bash
# Add to your shell profile once
eval "$(mycli --completions bash)"   # bash
eval "$(mycli --completions zsh)"    # zsh
mycli --completions fish | source    # fish
```

### How the protocol works

When argi detects `--_completions` in argv, it outputs completion candidates one per line and exits. The setup script registers a shell function that calls your CLI with `--_completions` and the current input tokens, piping the result to the shell's completion machinery.

Completions are generated from your live schema — no static file to maintain. Command-specific flags appear when a command is active. Value completion is suppressed for non-boolean flags so the shell falls through to filename suggestions.

## Troubleshooting

**Missing value for a flag:**

```bash
# Wrong: --output with no value
node script.js --output --verbose

# Correct: provide a value, or declare the flag as boolean
node script.js --output ./results --verbose
```

**Negating boolean flags with `--no-`:**

```javascript
const argi = new Argi({
	options: {
		debug: { type: 'boolean' },
	},
});
// --no-debug sets debug to false
```

**Debug parsing:**

```javascript
console.log('Raw args:', process.argv.slice(2));
console.log('Parsed options:', argi.options);
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
