import { describe, it, expect } from "vitest";
import { readSkills } from "../../src/scanner/skills";

describe("readSkills", () => {
  it("counts one SKILL.md per skill dir, reads frontmatter", async () => {
    const r = await readSkills("test/fixtures/tinkerer");
    expect(r.total).toBe(6);
    expect(r.items[0].name).toBeTruthy();
    expect(r.items[0].description).toBeTruthy();
  });
  it("malformed YAML frontmatter still counts as skill", async () => {
    const r = await readSkills("test/fixtures/bad-frontmatter");
    expect(r.total).toBe(1);
    expect(r.items[0].name).toBeNull();
  });
  it("withDescription counts skills with a non-blank description", async () => {
    const r = await readSkills("test/fixtures/tinkerer");
    expect(r.withDescription).toBe(r.total);
  });
  it("withDescription excludes skills with unparsed/missing description", async () => {
    const r = await readSkills("test/fixtures/bad-frontmatter");
    expect(r.withDescription).toBe(0);
  });
  it("happy path: parseWarnings is empty array", async () => {
    const r = await readSkills("test/fixtures/tinkerer");
    expect(r.parseWarnings).toEqual([]);
  });
});
