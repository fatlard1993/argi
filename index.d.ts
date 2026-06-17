export type BuiltinType = 'string' | 'number' | 'boolean' | 'integer' | 'json' | 'csv';

export interface TailConfig {
	name: string;
	variableName?: string;
	type?: BuiltinType | string;
	description?: string;
	required?: boolean;
	rest?: boolean;
	transform?: (value: unknown) => unknown;
	test?: (value: unknown) => boolean | string;
}

export interface FlagConfig {
	type?: BuiltinType | string;
	alias?: string | string[];
	variableName?: string;
	description?: string;
	required?: boolean;
	defaultValue?: unknown;
	transform?: (value: unknown) => unknown;
	test?: (value: unknown) => boolean | string;
}

export interface OptionsConfig {
	[key: string]: FlagConfig | undefined;
}

export interface CommandConfig {
	description?: string;
	options?: OptionsConfig;
	commands?: CommandsConfig;
}

export interface CommandsConfig {
	[name: string]: CommandConfig;
}

export interface DefaultsConfig {
	type?: string;
	transform?: Record<string, (value: unknown) => unknown>;
	test?: Record<string, (value: unknown) => boolean | string>;
	config?: Record<string, FlagConfig | false | undefined>;
}

export interface ArgiConfig {
	helpText?: string;
	usageText?: string;
	versionText?: string;
	defaults?: DefaultsConfig;
	packageJSON?: Record<string, unknown>;
	options?: OptionsConfig;
	tail?: TailConfig[];
	commands?: CommandsConfig;
	parse?: boolean;
	argv?: string[];
	remaining?: boolean;
}

export declare class ArgiExit {
	code: number;
	constructor(code?: number);
}

export declare class Argi {
	/** Parsed argument values — populated after construction or after a manual parse() call. */
	options: Record<string, unknown>;
	/** Arguments after a `--` separator, unparsed. Undefined if `--` was not present. */
	passThrough: string[] | undefined;
	/** Unparsed args collected when `remaining: true` is set. Pass to a nested Argi instance via `argv`. */
	remaining: string[] | undefined;
	/** First matched command name. Convenience alias for commandPath[0]. */
	command: string | undefined;
	/** Full matched command path, e.g. ['remote', 'add'] for `cli remote add`. Empty array when no command matched. */
	commandPath: string[];
	/** Tail argument schema, or null when no tail arguments were declared. */
	tail: TailConfig[] | null;
	helpText: string;
	/** User-declared flag schema. Built-in flags (help, version) are excluded. */
	config: Record<string, unknown>;
	defaults: Required<DefaultsConfig>;
	packageJSON: Record<string, unknown>;
	requiredOptions: string[];

	get usageText(): string;
	set usageText(value: string | undefined);
	get versionText(): string;
	set versionText(value: string | undefined);

	constructor(config: ArgiConfig);
	registerOptions(options?: OptionsConfig): void;
	parse(options?: OptionsConfig): this;
	printHelp(): never;
	printCompletions(shell: string, name?: string): never;
}

export declare const palette: {
	__reset: string;
	bold: string;
	white: string;
	cyan: string;
	magenta: string;
	blue: string;
	yellow: string;
	green: string;
	red: string;
	black: string;
	background: {
		white: string;
		cyan: string;
		magenta: string;
		blue: string;
		yellow: string;
		green: string;
		red: string;
		black: string;
	};
};

export declare function paint(text: string, ...styles: string[]): string;

export default Argi;
