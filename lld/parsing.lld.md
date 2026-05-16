# Flag Parsing
> src/argi.js

The rules for how flags are recognized and their values extracted. Two goals: unambiguous recognition regardless of how the user typed the input, and clear failure when a flag is misused.

## Flag assignment forms are equivalent
**method:** `spaceFormAssigns`

- `--flag value` and `--flag=value` are two spellings of the same thing — the caller receives identical output regardless of which form the user typed
  - does the space form assign the value?
  - does the equals form assign the same value?

## `--` makes everything after it opaque
**method:** `passThroughDoesNotContaminate`

- the `--` separator signals end-of-flags; nothing after it is interpreted as a flag or a command
  - does a flag-like string after `--` remain unparsed?
  - does the flag before `--` still parse correctly when extra content follows?

## Boolean presence is implicit; `--no-` negates
**method:** `booleanNegation`

- a boolean flag in argv evaluates to true without a value token; `--no-flagname` evaluates to false without needing a separate option declaration
  - does `--no-flag` set the option to false?

## Short flags can be chained
**method:** `chainedShortFlags`

- multiple single-character flags written as one token (`-abc`) each set their own option independently
  - does the first flag in a chain get set?
  - does the second flag in a chain get set?

## Non-boolean flags must be followed by a value
**method:** `missingValueFails`

- a non-boolean flag with no following value is an error — the parser does not silently assign null or undefined
  - does a non-boolean flag without a value cause parse to fail?

## Tail arguments can capture all remaining tokens
**method:** `restTailCaptures`

- a tail argument declared with `rest: true` captures all remaining positional tokens as an array rather than a single value — this is the standard pattern for file-list and variadic arguments
  - does a rest tail argument collect all remaining tokens into an array?
