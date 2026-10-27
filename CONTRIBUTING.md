# Contributing to daktilo-js

Thanks for helping! Bug reports, ideas and pull requests are all welcome. Issues and PRs can be written in English or Turkish.

## Setup

```bash
npm install
npm run build        # e2e tests and the playground use dist/
npm test             # unit tests (vitest + jsdom)
npm run test:e2e     # Playwright: Chromium, Firefox and WebKit
npm run playground   # http://127.0.0.1:5173/playground/
```

Before opening a PR, run what CI runs:

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && npm run build && npm run size && npm run lint:pkg
```

## Conventions

- **Zero runtime dependencies.** The published package must not depend on anything; framework wrappers use optional peer dependencies.
- **Size budget.** The core ESM build (`dist/index.mjs`) must stay under **6 KB** min + gzip (`npm run size`). New features that not every user needs belong in a separate entry point (like `daktilo-js/samples` or `daktilo-js/editor`), not in the core.
- **Public API docs in English.** JSDoc on exported types, options and methods ends up in the `.d.ts` files and the API reference, so write it in English. Internal comments and test descriptions are in Turkish; follow the surrounding code.
- **Tests.** Every bug fix comes with a test that fails without the fix. Behaviour that depends on real layout (line wraps, scrolling, fonts) needs an e2e test in `e2e/`.
- **Accessibility.** Typed text must stay readable by screen readers, and `prefers-reduced-motion` must be respected.
- **Formatting** is Prettier's job (`npm run format`).

## Changesets

Every user-facing change needs a changeset, written in English:

```bash
npx changeset
```

Pick `patch` for fixes, `minor` for new features and `major` for breaking changes. Releases are cut by a maintainer with the manual **Release** workflow, which applies the changesets, publishes to npm with provenance and creates the GitHub release.
