# CLAUDE.md

@docs/CODEMAP.md

## Codebase map

- `docs/CODEMAP.md` is the authoritative project map. Update it in the same change whenever you add/remove a workspace, rename a key module, add a new service, change an entry point, or alter a convention the map describes.

## Context

- Production, business-critical TypeScript project. Possibly outdated dependencies and patterns.
- The maintainer is new to TypeScript (experienced in Python and Java). Goal: learn and apply idiomatic TypeScript.
- Stability beats cleverness. When unsure, ask.

## Communication

- Be concise. Lead with the answer or the change; skip preamble and recaps.
- When introducing a TypeScript idiom, explain it in 1-2 sentences with a Python/Java comparison if helpful. Explain once, not every time.
- Flag risks, surprises and trade-offs briefly. Don't pad with praise or caveats.
- Disagree when something is a bad idea. Say why.

## First steps in any session

- Read `package.json`, `tsconfig.json`, lint/test config and CI config. Derive real commands from them; never guess.
- Check the TypeScript version and Node version before using newer syntax or features.
- Follow existing project conventions unless they conflict with this file; if they do, point it out and ask.

## Production safety

- Make small, focused, reviewable changes. One concern per change.
- No drive-by refactors or mass reformatting. Improve code only in files you are already changing.
- Never upgrade dependencies, the TypeScript version, Node version or build tooling without asking first.
- Never change public APIs, database schemas, config, env vars, or CI/CD without explicit approval.
- Never commit secrets. Never log sensitive data.
- Never delete or rewrite files wholesale, or run destructive commands, without asking.
- For risky changes, state the rollback path.

## Idiomatic TypeScript

- Strictness: `strict` stays on. Don't weaken `tsconfig`. Don't use `any`; use `unknown` and narrow. Avoid `as` casts and `!` non-null assertions; if unavoidable, add a comment explaining why.
- Prefer type inference for locals; annotate function parameters and exported return types.
- Model data with `type`/`interface` and discriminated unions rather than optional-field bags. Use exhaustive `switch` with a `never` check.
- Use `readonly`, `as const` and `ReadonlyArray` where data should not change.
- Prefer `const`; never `var`. Use `===`.
- Use `import type` for type-only imports. Prefer named exports over default.
- Prefer string-literal unions over `enum` unless the codebase already uses enums.
- Validate data at boundaries (HTTP, files, env, third-party APIs) and parse into typed values. Don't trust external data with type assertions.
- Use `async/await`; no unhandled promises; no floating promises.
- Throw `Error` subclasses only; never throw strings. Handle errors at the right layer; don't swallow them.

## Style: happy path on the left

- Use guard clauses and early returns for invalid/edge cases; keep the main logic at the lowest indentation.
- Avoid nested `if/else` and deep nesting. Extract a function instead.
- Small, single-purpose functions with clear names. Aim for pure functions.

## Functional style

- Prefer pure functions, immutability and composition. Push side effects (I/O, time, randomness) to the edges.
- Don't mutate arguments. Use spread, `map`, `filter`, `reduce`, `flatMap`, `Object.entries` etc. over manual loops with mutation (use a plain loop when it's clearer).
- Prefer plain functions and modules over classes, unless the framework or existing code requires classes.
- Inject dependencies as function parameters (or small interfaces) to keep code testable.
- Make invalid states unrepresentable via types.

## Dependencies

- Do not add libraries unless truly needed. Prefer the standard library, built-in Node/Web APIs and existing dependencies.
- Before proposing a new dependency, state: why it's needed, alternatives considered, maintenance status, size, and license. Wait for approval.

## Testing

- All new or changed behaviour must have tests. Bug fixes start with a failing test that reproduces the bug.
- Use the project's existing test framework and conventions; don't introduce another.
- Test behaviour through public interfaces, not implementation details. Cover happy path, edge cases and error paths.
- Keep tests deterministic and isolated: no real network, clock or randomness. Mock only at boundaries.
- Before marking work done: type-check, lint, and run the relevant tests (and the full suite for wide changes). Report results honestly; never claim tests passed without running them.
- When touching untested legacy code, add characterization tests first, then change it.

## Workflow

- For non-trivial tasks: briefly state the plan, then implement.
- Show diffs/summaries of what changed and why, in a few lines.
- Note any follow-up cleanup spotted, but don't do it unrequested.
- Commits: small, imperative-mood messages explaining the why.
