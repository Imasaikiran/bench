# Founder demo handle — `@imasaikiran` ops plan

> **Owner:** founder.
> **Spec ref:** `docs/specs/2026-04-25-bench-v2-design.md` §15 row 8 + §5.8 Stage 2 final paragraph.
> **Companion:** `docs/launch/phase0-outreach-copy.md`, `docs/plans/phase1-launch-runbook.md`.

---

## 1. Why this handle exists

Day 0 of public launch, `bench.dev` will have exactly two non-synthetic surfaces visible: the rubric (`/rubric`, `/how-we-scored`) and the founder's own profile at `bench.dev/u/imasaikiran`. The synthetic Priya at `/demo` is fictional and labelled as such.

Per spec §5.8: *"The founder scans and claims `@imasaikiran` on Day 1. This is the only hand-curated profile on launch. It functions as a reference card for 'what a well-tuned setup looks like' alongside synthetic Priya — but is explicitly labelled with its own scan date on the profile, and re-scanned publicly every 2 weeks in public. No one can say the demo is stale or cherry-picked."*

The handle is an anchor, not an aspiration target. Its job is to short-circuit the "is this thing even real?" question for first-time visitors.

---

## 2. Pre-launch scan procedure (Day -1 = May 21, 2026)

Run the scan against the staging deploy first to flush any environment-specific issues.

```
cd ~/path/to/bench-checkout
git checkout v2-dev
pnpm -C cli build
node cli/dist/index.js --debug --offline
```

Expected:
- Output writes `./bench-scan.json` and `./bench-scan.html` in the cwd.
- No `redaction_hits` in `diagnostics`. If non-zero: stop, manually inspect, fix the source file, rerun. The founder's own scan must be redaction-clean before going live.
- Score: founder estimate is 70–82 (Operator tier). If the score lands in Conductor (≥ 5 skills, ≥ 2 sub-dir CLAUDE.md, commit-burst ≥ 0.4 across CC-active repos), that's fine — the rubric earned it.
- Scan time: < 10s on the founder's primary machine.

Fields to spot-check before the public scan:
- `weeks_on_cc`: should match the date `~/.claude/CLAUDE.md` was first written (founder's mental anchor).
- `skills_total` and `skills_active`: matches the founder's expectation; if not, the SKILL.md frontmatter on a stray skill is broken — fix.
- `signature_verbs`: extracted from the founder's CC-active commit messages; verify the three picked are actually characteristic and not random.

If anything reads off, do NOT continue to the live scan. Fix the underlying setup file, rerun the offline scan, repeat until output reads clean.

---

## 3. Live scan + claim flow (Day 0 = May 22, 2026)

Run order, on launch morning, before any public tweet:

1. Confirm `bench.dev` is up via the launch runbook §2 smoke test (separate doc).
2. Open a fresh terminal. Clear shell history visible to streaming software.
3. Run `npx @imasaikiran/bench@latest` (production tag, not alpha).
4. Read the scanner preview aloud. Confirm:
   - Hero number reads like the offline-scan number from §2 (within ±5h).
   - Tier matches §2 prediction.
   - Tile values are plausible.
5. Type `y` to consent + upload.
6. CLI returns `{ id, url }`. Click the URL when the browser pops to `bench.dev/scan/<id>`.
7. On the rendered page, click "Claim this".
8. GitHub OAuth flow: confirm the redirect goes through `bench.dev/api/auth/github`, the OAuth scope shown is `read:user` only, and the callback returns to `bench.dev/u/imasaikiran`.
9. Verify the live `/u/imasaikiran` page renders:
   - All 25 dimensions (5 chapters × 5 slots) populated.
   - All 15 must-haves with correct state.
   - Hours number = the live scan's `hours_with_cc`.
   - Tier label.
   - Signature verbs exactly as previewed.
   - OG image at `https://bench.dev/api/og/imasaikiran` returns 200 and previews correctly when the URL is pasted into a fresh X DM compose box.
10. Take a screenshot of `/u/imasaikiran` and save to `docs/launch/screenshots/2026-05-22-day0-anchor.png` (commit after launch settles).

**Do NOT** click the share-on-X button on this profile — that is a separate launch-day step in the runbook and is timed with the public X thread, not the technical smoke test.

---

## 4. Public re-scan cadence (every 2 weeks through Phase 2)

| Date | Window | Cadence anchor |
|------|--------|----------------|
| 2026-05-22 | launch | initial scan |
| 2026-06-05 | +14d | first public re-scan |
| 2026-06-19 | +28d | second public re-scan |
| 2026-07-03 | +42d | third public re-scan |
| 2026-07-17 | +56d | (optional) — ends Phase 2 cadence |

Founder commits to running the first **3 re-scans in public** — either on a live X thread, a recorded demo posted within 24h, or in the Anthropic Discord `#claude-code` channel. After three public re-scans the cadence may move private (still re-scan every 2 weeks, just not on stream) provided the founder posts the resulting score + delta in a quote-tweet.

Calendar reminders to set on Day 0:
- iCal entry "bench rescan — public" recurring biweekly Friday 10:00 PT, 14 occurrences.
- Auto-stops at 28 weeks. Beyond that the cadence is reviewed against Phase 2 metrics.

---

## 5. Public re-scan script (founder X thread template)

For each public re-scan, post a short thread of the form:

> bench rescan, week N. score went from X to Y. pruned/added: [one-line summary]. board is at bench.dev/u/imasaikiran.
>
> what shifted (one tweet per chapter that moved):
>
> Foundation: [one line]
> Automation: [one line]
> Delegation: [one line]
> Craft: [one line]
> Coherence: [one line]
>
> the rubric is open at bench.dev/how-we-scored. PRs welcome.

Constraint: **do not edit the rubric in response to your own score moving the wrong way.** That is the gameable failure mode the rubric governance constitution (§6.1) exists to prevent. Founder's score is just one data point.

---

## 6. Failure modes

### 6.1 Score drops between rescans after a deliberate prune

Expected and OK. If the founder removes 4 unused skills the Coherence score should rise (no-bloat dim), but the Delegation score may drop if `skills_total` dropped under a threshold. The drop is honest. Post-it. Don't mask it.

### 6.2 Founder accidentally Conducts everyone else into a corner

If `@imasaikiran` is the only Conductor on `/stats` for the first 3 weeks and the median of public scans is Tinkerer/Craftsman, that's a possible "elite-only target" perception risk. Mitigation:
- The synthetic Priya at `/demo` is Tinkerer-tier explicitly to anchor the middle.
- Founder MAY publicly intentionally remove a few coherence-positive items (e.g. one of the sub-dir CLAUDE.md anchors) to land at Operator for at least one rescan window, as a demonstration that the rubric responds.
- Do NOT under any circumstances inflate Priya's score to "match" the founder. Synthetic data must stay fixed at its declared values.

### 6.3 Founder forgets a rescan window

Acceptable up to 1 week beyond the scheduled date. Beyond 1 week, post a short "missed the window" tweet — being honest about the slip beats catching up silently. The cadence is part of the trust contract; not the scan itself.

### 6.4 The OG card on `/u/imasaikiran` becomes stale on X / LinkedIn caches

Expected per §8.4.1. The first re-scan after Day 0 will ship a new `/api/og/imasaikiran` PNG; X/LinkedIn caches will catch up over 24–72h. Don't manually re-cache via X's debugger (some tooling lets you force a refresh) — let the natural cycle play out.

---

## 7. Rollback path (if `/u/imasaikiran` becomes a liability)

Sequence, ordered by reversibility:

1. **Re-scan with the actual current setup** to get the founder's score in line with reality. The fastest fix for "your demo profile is misleading" is usually a fresh honest scan.
2. **Move `/demo` to render synthetic Priya only**, dropping any "see also @imasaikiran" anchor link on the landing page. `/u/imasaikiran` stays accessible, just not promoted.
3. **Rotate the founder's claimed handle** to a new value (e.g. `@imasaikiran-archive`) and claim a fresh handle for current scans. This keeps the historical card honest at its frozen URL while removing the brand association.
4. **Last resort: delete the profile** via `/api/delete`. Spec §8.4 already covers what this does; do this only if the profile becomes actively harmful. Cached copies on external CDNs persist regardless (per §8.4.1).

The rollback path itself is part of the trust story. Document the choice publicly in a brief X thread when triggered — don't roll back silently.

---

## 8. What this doc does NOT promise

- It does not promise the founder's score never drops. Phase 0 + Phase 1 already gated the build on the rubric being honest, including against the founder.
- It does not promise the founder's profile is "the goal." Per §0.5.2 the primary user is the **anxious improver**, not the elite. The founder profile is a reference, not a target.
- It does not exempt the founder from rubric governance (§6.1). The founder cannot merge a rubric PR that pushes their own tier without satisfying the same evidence + cooldown bar as any other PR.
