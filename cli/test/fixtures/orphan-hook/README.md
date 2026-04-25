# orphan-hook fixture

Contains `hooks/cleanup.sh` on disk but an empty `settings.json` (no hooks section).
Used by `hooks.test.ts` to verify that hook files not referenced in settings are
counted as `orphaned` rather than `configured`.
