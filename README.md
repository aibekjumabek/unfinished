# Unfinished

A minimal place for ideas you’re not ready to finish. Built by [VibeCorp](https://vibecorp.xyz).

Capture a thought, set it aside, and come back when you’re curious again. No account required.

## Features

- Create and edit ideas with notes and categories.
- Search your shelf or move ideas to a resting shelf.
- Rediscover a random idea from either shelf.
- Export and import JSON backups.
- Use a responsive, keyboard-accessible interface.

## Getting started

Download the repository or clone it, then open its directory in your terminal. You need **Node.js 22 or newer**. Install dependencies with `pnpm install`.

## Run

```sh
pnpm dev
```

Open http://localhost:3000. Set `PORT` to choose another port.

Ideas are stored in this browser's localStorage. Export a JSON backup to move them to another browser or device; importing merges new IDs without replacing existing ideas. Example cards are inspiration, not saved ideas, until you save one. Rediscover draws from both shelves, avoiding the last result when possible.

Built with Next.js App Router and React. System fonts keep the interface self-contained.

Checks: `pnpm check` and `pnpm build`.

## Deploy to Vercel

Import this directory as the project root and select the Next.js preset. Vercel detects pnpm from the lockfile. Build with `pnpm build`; leave the output directory at its Next.js default.

Enable **Web Analytics** in the Vercel project dashboard before deploying (or redeploy after enabling). The root layout uses `@vercel/analytics/next`.

After deployment, verify the analytics script and page-view request succeed, then check the Analytics dashboard. Idea titles and notes are not sent as custom events.

Ideas remain browser-local and do not sync between devices. Export local-preview ideas and import them on the deployed domain if you want to move them.

## Project structure

| File | Purpose |
| --- | --- |
| `app/page.js` | React interface, editor, and browser storage |
| `app/layout.js` | Metadata and Vercel Analytics |
| `app/globals.css` | Responsive styles |
| `app/icon.svg` | Uppercase U favicon |
| `lib/ideas.js` | Examples and backup validation |
| `lib/ideas.test.js` | Backup compatibility checks |

## Data and privacy

Saved ideas stay in this browser's localStorage. Clearing site data removes them; use Export to keep a backup. There is no account, cloud sync, or server-side idea database. Production builds include Vercel Web Analytics for page views; the app does not send idea titles or notes as analytics events.

## Contributing

Bug reports and focused improvements are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and pull request guidance.

## License

[MIT](LICENSE) — Copyright (c) 2026 Aibek Jumabek.
