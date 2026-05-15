# Repository Guidelines

## Project Structure & Module Organization

Nuxt 4 boots from `app.vue`, with file-based routes in `pages/` and shared shells in `layouts/`. UI elements live in `components/`, composables in `composables/`, and shared helpers in `utils/` plus TypeScript defs in `typings/`. Markdown content sits in `content/` under the schema from `content.config.ts`. Vite-managed assets go in `assets/`, passthrough files in `public/`, localization resources in `lang/` and `i18n/`, and any server handlers in `server/`.

## Build, Test, and Development Commands

Install dependencies via `pnpm install --shamefully-hoist` to respect the pinned lockfile. `pnpm dev` starts the hot-reloading app on `http://localhost:3000`. Use `pnpm build` for production bundles, `pnpm preview` for smoke tests, and `pnpm generate` when static output is required. After adding Nuxt modules or content types, run `pnpm exec nuxt prepare` to refresh generated typings.

## Coding Style & Naming Conventions

Oxfmt enforces two-space indentation, single quotes, trailing commas, and semicolon-free code—validate with `pnpm format:check` and apply formatting with `pnpm format`. Oxlint is the default lint path via `pnpm lint`, with auto-fixes available through `pnpm lint:fix`. Prefer PascalCase filenames for Vue components and composables, kebab-case content slugs, and keep props immutable. Replace any temptation to use `@ts-ignore` with explicit types or runtime guards.

## Testing Guidelines

No automated suite ships yet, so add unit or integration coverage alongside meaningful changes (Vitest plugs in cleanly when you scaffold `tests/`). Until then, verify features by running `pnpm dev`, exercising localized routes, and checking production output with `pnpm preview`. Capture noteworthy manual QA steps in your PR so reviewers can mirror them.

## Commit & Pull Request Guidelines

Keep commits focused, linted, and linked to issues via `closed #123` when applicable. Pull requests should outline the change, list validation steps, attach UI captures when relevant, and mention any affected locales or content entries. The project does not enforce Git hooks or commit-message tooling.

## Content & Localization Notes

Include `lang` metadata and slug variants when adding markdown so localized routes stay stable. Place translation keys in the `lang/` bundles rather than hard-coding strings. When changes depend on environment variables, update `.env.example` with safe placeholders to unblock collaborators.
