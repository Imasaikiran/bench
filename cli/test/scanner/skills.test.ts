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
});
