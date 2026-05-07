# cli/src/assets

Generated artifacts. Source of truth: `../../web/public/v1/`.

`styles.css` and `script.js` are overwritten by `pnpm prebuild`'s
`copy:assets` step. Edit the originals in `web/public/v1/` instead;
the v1.0.0 hash-pinned guard test in `web/test/v1-frozen.test.ts`
will scream if you do.

`offline-template.html` is the CLI's own offline export shell — NOT
a copy of v1's `index.html`. Edit in place.
