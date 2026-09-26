# Contributing to Unfinished

Thanks for helping make a small, thoughtful home for ideas.

## Local setup

Use Node.js 22 or newer. Fork the repository, clone your fork, and run:

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. Use pnpm and commit `pnpm-lock.yaml` when dependencies change.

## Making a change

1. Create a branch for your change.
2. Keep changes focused. For a large feature or design change, open an issue first to discuss it.
3. Run `pnpm check` and `pnpm build`.
4. Check the affected behavior in a browser, including a narrow mobile viewport. If changing storage, verify saving, reloading, and export/import with disposable test ideas.
5. Open a pull request explaining the problem, the change, and how you verified it. Include screenshots for visual changes.

Keep the interface minimal, keyboard-accessible, and usable without an account. Avoid introducing dependencies without a clear need. Never include personal ideas, credentials, or exported backups in a pull request.

## Reporting bugs

Open an issue with steps to reproduce, expected and actual behavior, and your browser/device. Use fictional example ideas when sharing screenshots or backups.

## License

Contributions are provided under the project's MIT license.
