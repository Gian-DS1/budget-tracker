# Contributing to FinTrack

FinTrack is a personal project, but issues and pull requests are welcome. This
page explains how to get it running and what the code expects from a change.

> The working language of the project is Spanish: code comments, commit messages
> and the design docs in [`docs/decisions/`](docs/decisions) are written in Spanish.
> The README and this file are in English so the repo reads for a wider audience.
> Either language is fine in issues and PRs.

---

## Getting set up

```bash
git clone https://github.com/Gian-DS1/fintrack.git
cd fintrack
npm install
npm run dev      # http://localhost:5173
```

You do **not** need a Supabase project to develop most of the app. On `localhost`
the landing page shows a **"Ver demo"** button that seeds sample data straight
into the Zustand stores — no backend, no account, nothing persisted. Use it for
UI work, and see the [README](README.md#2-wire-up-a-real-backend-optional) when
you need real auth and persistence.

---

## Before you open a pull request

```bash
npm run lint         # ESLint — must be clean
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright, against the production build in demo mode
```

CI runs all three plus `npm run build` on every push and PR
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)). A PR that does not pass
locally will not pass there either.

If your change touches the UI, regenerate the README images:

```bash
npm run screenshots
```

---

## How the code is organised

Read [Architecture](README.md#-architecture) first. The conventions that matter
most when writing a change:

- **The UI lives entirely in `src/stitch/`.** A screen with sub-components is a
  thin shell (`StitchDebts.jsx`) plus a `screens/<page>/` folder for its parts.
- **Financial logic goes in pure selectors, not in components.** Files like
  `selectors.js`, `payoff.js` and `projection.js` take plain data and return plain
  data, so they can be unit-tested without React. If you find yourself computing
  money inside a `useMemo` in a component, that calculation probably belongs in a
  selector with a test next to it.
- **One Zustand store per domain** (`useTransactionStore`, `useDebtStore`, …).
  Each store owns its Supabase table and its own `sessionStorage` cache; screens
  do not talk to Supabase directly.
- **Every user-facing string goes through i18n.** Add both `es` and `en` entries in
  `src/i18n/translations.js` — a missing key is a visible bug in the other language.
- **Money is never a float you format by hand.** Use the helpers in `src/utils/`
  so currency formatting stays consistent with the user's `Intl` locale.

---

## Tests

Anything that computes money needs a unit test. The existing suites are the best
guide to the expected style — small, table-driven cases over pure functions:

```
src/utils/*.test.js          # calculations: budgets, card cycles, payoff, recurrence
src/stitch/screens/**/*.test.js   # pure screen selectors
tests/*.e2e.spec.js          # Playwright flows against demo mode
```

For a change with non-obvious behaviour, writing the failing test first and
committing it is genuinely useful here — see the TDD write-up in
[`docs/decisions/2026-07-17-wealth-line-chart-tdd.md`](docs/decisions/2026-07-17-wealth-line-chart-tdd.md).

---

## Database changes

`supabase/schema.sql` is the source of truth and must stay idempotent: a fresh
database created from it should be complete. Any change also needs a standalone
migration file for existing databases, listed in the right order in
[`supabase/MIGRATIONS.md`](supabase/MIGRATIONS.md).

Every table is protected by Row Level Security (`auth.uid() = user_id`). A new
table without an RLS policy is a data leak, not a missing nice-to-have.

---

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/),
in Spanish, with the area as the scope:

```
feat(dashboard): línea punteada con ping de HOY
fix(tarjetas): el corte no se adelantaba en meses de 30 días
chore: actualiza dependencias
```

Keep a commit to one coherent change. `docs:`, `test:`, `refactor:`, `perf:` and
`ci:` are all in use.

---

## Security

Do not open a public issue for a vulnerability. Use a
[private security advisory](https://github.com/Gian-DS1/fintrack/security/advisories/new)
instead — see [`docs/SECURITY.md`](docs/SECURITY.md).
