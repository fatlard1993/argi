# Argi
> src/argi.js

A CLI argument parser. The caller declares a schema — what arguments to expect and what types they should become — and the parser converts raw argv strings into a typed plain object ready for use. Nothing enters the output without a declaration; nothing declared is missing without either a value or a default.

## Argument kinds are declared, not inferred
**method:** `subCommandConsumedFirst`

- argv can contain three distinct kinds of input: positional commands, named flags, and positional trailing arguments — the caller names each kind explicitly so the parser never has to guess
  - does a declared sub-command capture its positional slot before flags are processed?
  - does a flag still resolve correctly when a sub-command precedes it?
  - does a tail argument capture its slot after all flags are consumed?
  - does input spanning all three categories resolve correctly from one shared argv array?

## The declared name is always the output key
**method:** `canonicalNameFromAlias`

- a flag may be invoked by any of its aliases, but the result object always carries the name the caller declared — aliases are input shortcuts, not output keys
  - does invoking a flag by its alias set the canonical key, not the alias key?
  - does the long form of a single-character alias name a nonexistent option?

## Defaults fill in only after parsing completes
**method:** `defaultFilled`

- defaults do not participate in parsing; they are applied to any flag absent from the input only after the full parse cycle finishes
  - does an absent flag receive its declared default value?

## Optional flags with no default remain absent in the output
**method:** `defaultFilled`

- a flag that is optional, has no default value, and is not provided in argv does not appear in the options object at all — it is not set to null, empty string, or any other placeholder
- this is the third state: required+missing throws, optional+missing+default fills, optional+missing+no-default → absent
  - does an optional flag with no default produce result.flag → absent when not provided in argv?

## Required applies to all three argument kinds
**method:** `requiredEnforced`

- required is not flag-specific — any declared sub-command, flag, or tail argument can be marked required; the rule is the same across all three categories
  - does a missing required flag cause parse to fail?

## Unrecognized input is always an error
**method:** `unknownFlagFails`

- the parser accepts only declared arguments; any unrecognized flag or leftover positional is an error, not a silent pass-through
  - does an unrecognized flag cause parse to fail?
