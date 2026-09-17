# AGENTS.md

- Use pnpm. Find workspace commands in the root `package.json` and package-specific commands in each package's `package.json`.
- Consult `README.md` for package layout and development setup. Server components also run in browser workers; preserve browser compatibility when changing shared server code.
- Document public APIs with TSDoc and use `{@link Symbol}` for cross-references. Explain behavior and non-obvious decisions rather than restating signatures.
- After code changes, run the /fix skill. Resolve failures and repeat until build, lint, formatting, headers, and tests pass.
- `CHANGELOG.md` is generated from the merged PRs before a release. Do not add or bump entries manually.
