import { test } from "node:test";
import assert from "node:assert/strict";

import { aggregatePrevalence } from "../lib/aggregate.mjs";

test("counts only 'have' states, per dimension id", () => {
  const result = aggregatePrevalence([
    { repo: "a/a", states: { "1": "have", "2": "partial", "3": "missing" } },
    { repo: "b/b", states: { "1": "have", "2": "have", "3": "missing" } },
  ]);

  assert.equal(result.denominator, 2);
  assert.deepEqual(result.dimensions, { "1": 2, "2": 1 });
});

test("skipped sources (states: null) do not count toward denominator", () => {
  const result = aggregatePrevalence([
    { repo: "a/a", states: { "1": "have" } },
    { repo: "b/b", states: null },
  ]);

  assert.equal(result.denominator, 1);
  assert.deepEqual(result.dimensions, { "1": 1 });
});

test("omits dimension ids with zero haves", () => {
  const result = aggregatePrevalence([
    { repo: "a/a", states: { "1": "missing", "2": "partial" } },
  ]);

  assert.equal(result.denominator, 1);
  assert.deepEqual(result.dimensions, {});
});

test("empty input yields honest-empty shape", () => {
  const result = aggregatePrevalence([]);

  assert.deepEqual(result, {
    denominator: 0,
    denominator_label: "public setups benchmarked",
    dimensions: {},
  });
});

test("all sources skipped yields honest-empty shape", () => {
  const result = aggregatePrevalence([
    { repo: "a/a", states: null },
    { repo: "b/b", states: null },
  ]);

  assert.equal(result.denominator, 0);
  assert.deepEqual(result.dimensions, {});
});

test("denominator_label matches rubric/prevalence.ts expected shape", () => {
  const result = aggregatePrevalence([{ repo: "a/a", states: { "5": "have" } }]);
  assert.equal(result.denominator_label, "public setups benchmarked");
});
