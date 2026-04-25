# bad-frontmatter fixture

Contains a `skills/sample/SKILL.md` with intentionally malformed YAML frontmatter.
Used by `skills.test.ts` to verify that a skill file is still counted even when
its frontmatter cannot be parsed (name/description come back null).
