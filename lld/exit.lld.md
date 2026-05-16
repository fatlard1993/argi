# Exit Model
> src/argi.js

A CLI program ends in one of two ways: it delivers its result, or it reaches a defined stopping point — help request, version request, bad input. The second category is not exceptional; it is a normal, expected part of CLI invocation. ArgiExit is how the parser communicates which stopping point was reached. It carries a code and nothing else. It is not an Error subclass because it is not a bug.

## Help and version are built-in and always honored
**method:** `helpExitCode`

- `--help`, `-h`, `-?`, and `--version` are registered in every schema by default; they can be disabled or replaced by passing a `defaults.config` object to the constructor
- help and version requests are honored before validation runs — asking for help is always valid regardless of whether required flags are present
  - does `--help` produce a zero exit code?
  - does `--version` produce a zero exit code?
  - does `-h` produce a zero exit code?

## Bad input exits with failure
**method:** `unknownFlagExitCode`

- when the user's input is wrong, the process exits non-zero to signal failure to the calling environment
  - does an unknown flag produce a non-zero exit code?

## The constructor handles the normal case
**method:** `constructorExitsOnError`

- callers do not need to catch ArgiExit — the constructor catches it and calls process.exit, so the program ends cleanly with no error handling required at the call site
  - does an error during construction trigger process.exit?
  - does a valid construction leave process.exit uncalled?

## `parse: false` separates registration from the argv walk
**method:** `parseManuallyFails`

- constructing with `parse: false` runs option registration immediately — aliases, required lists, and flag name maps are built — but defers the argv walk to an explicit `parse()` call; this is the window for custom orchestration before the parse is committed
- ArgiExit propagates to the caller instead of calling process.exit, enabling custom error handling
  - does constructing with `parse: false` and calling parse() throw on invalid input?
