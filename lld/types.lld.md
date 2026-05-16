# Type System
> src/argi.js

The parser's core job: convert raw argv strings into values the caller can use directly. The mechanism is a transform map — type names are keys, conversion functions are values. Built-in types cover the common shapes; the map is replaceable so callers can extend or override any type. Validation runs after conversion, so the test function always sees the typed value the code will actually work with.

## The transform map is the conversion layer
**method:** `pluggableTransform`

- built-in types are defaults in the transform map — replacing one changes how every flag of that type is coerced, across all options
  - does replacing the string transform affect all string flags?

## Built-in types cover the common input shapes
**method:** `builtinBooleanType`

- the map ships with implementations for string, boolean, integer, number, json, and csv — the caller picks the right shape for each flag
  - does the boolean type accept truthy strings case-insensitively?
  - does the integer type produce a number, not a string?

## A per-flag transform replaces the type default entirely
**method:** `perFlagTransformOverride`

- a transform defined on a specific flag takes the place of whatever the type-level transform would have done — the flag's declared type becomes irrelevant when a transform is present
  - does a flag-level transform override the built-in type conversion?

## Validation receives the already-coerced value
**method:** `customTestRejection`

- the test function runs after the transform; it sees what the code will actually use, not the raw input string
  - does a failing custom test cause parse to fail?

## The built-in number type validates after conversion
**method:** `numberValidationRejectsNaN`

- the number transform runs first; the built-in test then rejects NaN — a non-numeric string fails because the transform produces NaN, not because the string itself is checked
  - does a non-numeric string fail number type validation?
