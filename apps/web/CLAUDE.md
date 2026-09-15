# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start dev server at http://localhost:3000 (hot reload)
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint (flat config: next/core-web-vitals + next/typescript)

There is no test setup.

## Architecture

Fresh Next.js 16 App Router project (create-next-app template), TypeScript strict mode, React 19, Tailwind CSS v4.

- All routes/UI live in `app/` — currently just `layout.tsx` (root layout, loads Geist fonts via `next/font`) and `page.tsx`.
- Tailwind v4 is configured via CSS, not a JS config file: `app/globals.css` uses `@import "tailwindcss"` and `@theme inline` for design tokens (`--color-background`, `--color-foreground`, font variables). Dark mode follows `prefers-color-scheme`.
- Path alias: `@/*` maps to the repo root.
- `.agents/skills/` contains installed agent skill data (ui-ux-pro-max), not application code — ignore it when working on the app.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
