# DB migration deploy runbook

Production migrations are **not** wired into the Vercel build. Vercel runs
preview builds for every PR and rebuilds on rollbacks; running `pnpm migrate`
in `vercel.json` would either (a) apply unreviewed schema to prod from a
preview build or (b) race two concurrent builds against the same database.

Instead: a dedicated GitHub workflow (`.github/workflows/migrate.yml`) runs
`pnpm -C web migrate` against the production `DATABASE_URL`, gated behind a
manual confirmation input.

## Required secrets

Configure these once in repo Settings → Secrets and variables → Actions:

- `DATABASE_URL` — Neon production connection string (set on the
  `production` GitHub Environment, not as a plain repo secret, so reviewers
  are required if you add a protection rule).
- `NPM_TOKEN` — npm automation token for the publish workflow (separate
  concern, listed here for the same secrets-setup pass).

## Order of operations on a release

1. Land schema change on `v2-dev` with the SQL file under
   `web/migrations/` (e.g. `0002_add_foo.sql`). Migrations are
   forward-only and applied in lexicographic order.
2. Merge to `main`. Vercel auto-deploys the new code.
3. **Wait for the Vercel deploy to report success.**
4. Trigger `DB migrate (production)` from the Actions tab. Type `MIGRATE`
   in the confirmation input.
5. Verify in Neon that `_migrations` has the new file recorded.

If the new code requires the new schema, deploy in the safe order:
   ship code that **tolerates both** old and new schemas → run migration →
   ship code that **requires** the new schema. Single-step migrations that
   couple code and schema must be avoided.

## Why not auto-run

- `vercel.json buildCommand` runs in preview builds too — would corrupt
  prod from any PR.
- `postdeploy` hooks: Vercel does not provide one; webhook + GitHub
  `repository_dispatch` would work but adds infra without buying us
  anything over a 30-second manual click.
- The `workflow_dispatch` form requires typing `MIGRATE` — one keystroke
  of friction is the right amount for a destructive prod operation.

## Rollback

`web/migrations/run.ts` is forward-only. To roll back, write a new
migration that reverses the change (e.g. `0003_revert_foo.sql`) and run
the workflow again. Do not edit applied migration files in place.
