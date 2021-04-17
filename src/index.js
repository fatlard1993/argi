#!/usr/bin/env node

const argi = module.exports = {
	helpText: '',
	defaults: {
		type: 'string',
		transform: {
			string: String,
			number: Number,
			boolean: (value) => { return argi.booleanValueTable[value]; }
		},
		test: {
			number: (value) => { return !isNaN(value); }
		},
		config: {
			help: { type: 'boolean', alias: ['h', '?'] },
			version: { type: 'boolean' }
		}
	},
	booleanValueTable: { true: true, false: false, 1: true, 0: false },
	host: require(`${process.cwd()}/package.json`),
	get usageText(){
		let usage = '';

		if(argi.customUsageText) usage = argi.customUsageText;

		else {
			usage += `Usage:\n\n${argi.host.name}`;

			if(argi.config.__subCommands) argi.config.__subCommands.forEach(({ name }) => { usage += ` [${name}]`; });

			argi.requiredOptions.forEach((flag) => {
				usage += ` ${argi.getFlagUsageText(flag)}`;

				argi.config[flag].printedUsage = true;
			});

			usage += ' [';

			Object.keys(argi.config).forEach((flag, index) => {
				if({ __subCommands: true, __tail: true }[flag] || argi.config[flag].printedUsage) return;

				usage += `${index ? ' | ' : ''}${argi.getFlagUsageText(flag)}`;
			});

			usage += ']';

			if(argi.config.__tail) argi.config.__tail.forEach(({ name }) => { usage += ` [${name}]`; });

			usage += '\n';
		}

		return usage;
	},
	set usageText(val){ argi.customUsageText = val; },
	get versionText(){
		const { version, name } = argi.host;

		return argi.customVersionText || `\n[${name}] Version: ${version}\n`;
	},
	set versionText(val){ argi.customVersionText = val; },
	getFlagUsageText: function(flag){
		const { string, type = argi.defaults.type, variableName = type, required } = argi.config[flag];

		return `${required ? '' : '['}${string.replace(/,\s/g, '|')}` + (type === 'boolean' ? '' : ` <${variableName}>`) + (required ? '' : ']');
	},
	getFlagHelpText: function(flag){
		const { type = argi.defaults.type, defaultValue, string, variableName = type } = argi.config[flag];
		let { description = '' } = argi.config[flag];

		if(description.length) description = `\t${description}\n`;

		return `${string}\n\t[${variableName}${typeof defaultValue === 'undefined' ? '' : (' :: '+ defaultValue)}]\n${description}`;
	},
	printHelp: function(){
		console.log(argi.versionText);

		if(argi.helpText !== '') console.log(argi.helpText, '\n');

		console.log(argi.usageText);

		['subCommands', 'tail'].forEach((position) => {
			if(!argi.config[`__${position}`]) return;

			console.log(`\n${position === 'tail' ? 'Tailing Arguments' : 'Sub Commands'}:\n`);

			argi.config[`__${position}`].forEach(({ description, name }) => {
				if(description.length) description = `\n\t${description}\n`;

				console.log(`${name.toUpperCase()}\n\t[${name}]${description}`);
			});
		});

		if(argi.requiredOptions.length){
			console.log('\nRequired Flags:\n');

			argi.requiredOptions.forEach((flag) => {
				console.log(argi.getFlagHelpText(flag));

				argi.config[flag].printedHelp = true;
			});
		}

		console.log(`\n${argi.requiredOptions.length ? 'Optional ' : ''}Flags:\n`);

		Object.keys(argi.config).forEach((flag) => {
			if({ __subCommands: true, __tail: true }[flag] || argi.config[flag].printedHelp) return;

			console.log(argi.getFlagHelpText(flag));
		});

		argi.exit();
	},
	splitAtIndex: function(str, index){
    return [str.slice(0, index), str.slice(index)];
	},
	escapeRegex: function(str){
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	},
	exit: function(){
		process.kill(process.pid, 'SIGTERM');
	},
	registerOptions: function(options = {}){
		argi.config = Object.assign(argi.config || {}, argi.defaults.config, options);
		argi.optionNames = Object.keys(argi.config);
		argi.flagNames = [];
		argi.requiredOptions = [];
		argi.aliasMap = argi.aliasMap || {};

		function registerAlias(alias, flag){
			argi.flagNames.push(alias);

			argi.aliasMap[alias] = flag;
		}

		argi.optionNames.forEach((flag) => {
			if({ __subCommands: true, __tail: true }[flag]) return;

			const { alias, required } = argi.config[flag];

			if(required) argi.requiredOptions.push(flag);

			argi.flagNames.push(flag);

			if(argi.config[flag].string) return;

			argi.config[flag].alias = [flag].concat(alias || []);
			argi.config[flag].string = argi.config[flag].alias.map((alias) => { return `${alias.length > 1 ? '--' : '-'}${alias}`; }).join(', ');

			if(typeof alias === 'string') registerAlias(alias, flag);
			else if(alias instanceof Array) alias.forEach((alias) => { registerAlias(alias, flag); });
		});

		argi.flagNames = argi.flagNames.sort((a, b) => { return b.length - a.length || a.localeCompare(b); });
	},
	parsePassThrough: function(){
		argi.argArray = Array.from(process.argv).slice(2);

		const passThroughSplit = argi.argArray.indexOf('--');

		if(passThroughSplit < 0) return;

		argi.passThrough = argi.argArray.slice(passThroughSplit + 1, argi.argArray.length);
		argi.argArray = argi.argArray.slice(0, passThroughSplit);
	},
	parseSubCommands: function(){
		if(!argi.config.__subCommands || !argi.argArray[0] || argi.argArray[0][0] === '-') return;

		let parsedSubCommands;

		Array.from(argi.argArray).forEach((arg, index) => {
			if(parsedSubCommands || arg[0] === '-' || !argi.config.__subCommands[index]){
				parsedSubCommands = true;

				return;
			}

			const { test, name, type = argi.defaults.type, transform = argi.defaults.transform[type] } = argi.config.__subCommands[index];

			arg = transform(arg);

			if(test) argi.testOption(name, arg, test);

			argi.argArray.shift();

			argi.options[name] = arg;
		});
	},
	parseTailArgs: function(){
		if(!argi.config.__tail || !argi.argArray[0]) return;

		let parsedTailArgs;

		Array.from(argi.argArray).forEach((arg, index, argArray) => {
			if(parsedTailArgs || arg[0] === '-'){
				parsedTailArgs = true;

				return;
			}

			if(!argi.config.__tail[index]){
				console.warn(`"${arg}" is not a defined tail argument`);

				argi.exit();
			}

			const { rest, test, name, type = argi.defaults.type, transform = argi.defaults.transform[type] } = argi.config.__subCommands[index];

			if(rest){
				arg = argArray.slice(index);

				argi.argArray.splice(index - 1);

				parsedTailArgs = true;
			}

			else argi.argArray.shift();

			arg = transform(arg);

			if(test) argi.testOption(name, arg, test);

			argi.options[name] = arg;
		});
	},
	testOption: function(option, value, test){
		let testResults = test(value);

		if(testResults && typeof testResults === 'boolean') return;

		console.log(testResults || `"${option}": "${value}" failed test: ${test.toString()}`, '\n');

		argi.exit();
	},
	enforceRequired: function(){
		if(argi.config.__subCommands){
			argi.config.__subCommands.forEach((cmd) => {
				if(cmd.required && typeof argi.options[cmd.name] === 'undefined'){
					console.error(`"${cmd.name}" is required: ${argi.host.name}${argi.config.__subCommands.map(({ name }) => { return ` [${name}]`; }).join('')}\n`);

					argi.exit();
				}
			});
		}

		if(argi.requiredOptions){
			argi.requiredOptions.forEach((option) => {
				if(typeof argi.options[option] === 'undefined'){
					console.error(`"${option}" is required\n\nFor more information: ${argi.host.name} --help\n`);

					argi.exit();
				}
			});
		}

		if(argi.config.__tail){
			argi.config.__tail.forEach((cmd) => {
				if(cmd.required && typeof argi.options[cmd.name] === 'undefined'){
					console.error(`"${cmd.name}" is required: ${argi.host.name}${argi.config.__tail.map(({ name }) => { return ` [${name}]`; }).join('')}\n`);

					argi.exit();
				}
			});
		}
	},
	applyDefaultValues: function(){
		argi.optionNames.forEach((flag) => {
			const { defaultValue, match } = argi.config[flag];

			if(match || typeof defaultValue === 'undefined') return;

			argi.options[flag] = defaultValue;
		});
	},
	parse: function(options){
		argi.options = {};

		if(options) argi.registerOptions(options);

		argi.parsePassThrough();
		argi.parseSubCommands();

		argi.flagNames.forEach((alias) => {
			const flag = argi.aliasMap[alias] || alias;

			if(argi.config[flag].match || !argi.argArray.length) return;

			const { type = argi.defaults.type, transform = argi.defaults.transform[type], variableName = type, test = argi.defaults.test[type], defaultValue } = argi.config[flag];

			const longFlag = alias.length > 1, newArgs = [];
			const flagRegex = longFlag ? new RegExp(`^--(${type === 'boolean' ? '(no-?)?' : ''}(${argi.escapeRegex(alias)}).*)`) : new RegExp(`^-([^-=]*(${argi.escapeRegex(alias)}).*)`);

			for(let x = 0, count = argi.argArray.length, arg, flagMatch; x < count; ++x){
				arg = argi.argArray[x];

				if(!arg) continue;

				if(arg[0] !== '-'){ // not a flag
					newArgs.push(arg);

					continue;
				}

				flagMatch = flagRegex.exec(arg);

				if(!flagMatch){
					newArgs.push(arg);

					continue;
				}

				argi.config[flag].match = flagMatch;

				const splitArg = [flagMatch[type === 'boolean' ? 1 : 2], type === 'boolean' && /no-?/.test(flagMatch[2]) ? '' : flagMatch[1].replace(flagMatch[2], '')];
				const remainder = flagMatch[1].replace(splitArg[0], '').replace(/^=/, '');

				let value = defaultValue;

				if(remainder){
					if(type === 'boolean' && !longFlag) newArgs.push(`-${remainder}`);

					else value = remainder;
				}

				else {
					let nextArg = argi.argArray[x + 1];

					if(nextArg && nextArg[0] !== '-' && (type !== 'boolean' || typeof argi.booleanValueTable[nextArg] !== 'undefined')){
						// use the next argument as the value

						++x;

						value = type === 'boolean' ? argi.booleanValueTable[nextArg] : nextArg;
					}

					else if(type !== 'boolean') {
						console.log(`Missing value: --${flag} <${variableName}>\n`);

						argi.exit();
					}
				}

				if(type === 'boolean') argi.options[flag] = typeof value !== 'undefined' ? transform(value) : splitArg[0] === 'no' ? false : true;

				else argi.options[flag] = transform(value);

				if(test) argi.testOption(flag, argi.options[flag], test);

				newArgs.push(...argi.argArray.slice(x + 1));

				break;
			}

			argi.argArray = newArgs;
		});

		if(argi.defaults.config.help && argi.options.help) argi.printHelp();

		if(argi.defaults.config.version && argi.options.version){
			console.log(argi.versionText);

			argi.exit();
		}

		argi.parseTailArgs();
		argi.enforceRequired();
		argi.applyDefaultValues();

		if(argi.argArray.length){
			console.log(`No definition for: ${argi.argArray}\n\nFor more information: ${argi.host.name} --help\n`);

			argi.exit();
		}

		return argi;
	}
};