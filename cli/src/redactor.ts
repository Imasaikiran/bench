export type RedactionHit = { kind: string; location?: string };

// §8.1 patterns. Order matters: the FIRST matching pattern's `kind`
// becomes hits[0].kind. Specific patterns (openai-key, aws-access-key)
// must precede generic catch-alls (generic-secret, email).
export const REDACTION_PATTERNS: Array<{ kind: string; re: RegExp; replace: string }> = [
  { kind: "openai-key",      re: /\bsk-[A-Za-z0-9_-]{20,}\b/g,                                         replace: "<redacted:openai-key>" },
  { kind: "github-pat",      re: /\bghp_[A-Za-z0-9]{36}\b/g,                                           replace: "<redacted:github-pat>" },
  { kind: "github-pat-fg",   re: /\bgithub_pat_[A-Za-z0-9_]{80,}\b/g,                                  replace: "<redacted:github-pat>" },
  { kind: "slack-token",     re: /\bxox[baprs]-[A-Za-z0-9-]+/g,                                        replace: "<redacted:slack-token>" },
  { kind: "aws-access-key",  re: /\bAKIA[0-9A-Z]{16}\b/g,                                              replace: "<redacted:aws-access-key>" },
  { kind: "aws-secret",      re: /aws_secret_access_key\s*=\s*['"]?[A-Za-z0-9+\/=]{30,}/gi,            replace: "<redacted:aws-secret>" },
  { kind: "private-key",     re: /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g, replace: "<redacted:private-key>" },
  { kind: "jwt",             re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, replace: "<redacted:jwt>" },
  { kind: "generic-secret",  re: /(password|passwd|secret|token|api[_-]?key)\s*=\s*['"][^'"]{6,}['"]/gi, replace: "$1=<redacted:secret>" },
  { kind: "url-userinfo",    re: /https?:\/\/[^:@\s]+:[^@\s]+@[^\s\/]*/g,                               replace: "<redacted:url-userinfo>" },
  { kind: "email",           re: /[\w.+-]+@[\w-]+\.[\w.-]+/g,                                          replace: "<redacted:email>" },
  { kind: "home-path",       re: /\/Users\/[^/\s]+/g,                                                  replace: "~" },
  { kind: "home-path",       re: /\/home\/[^/\s]+/g,                                                   replace: "~" },
  { kind: "home-path",       re: /C:\\Users\\[^\\]+/g,                                                 replace: "~" },
];

// Matches $N backreference tokens in a replace string (e.g. "$1").
const HAS_BACKREF = /\$\d/;

export function redact(input: string): { text: string; hits: RedactionHit[] } {
  const hits: RedactionHit[] = [];
  let text = input;

  for (const p of REDACTION_PATTERNS) {
    if (HAS_BACKREF.test(p.replace)) {
      // Use String#replace's native $N expansion; count hits via match().
      // text.match() with global flag returns all matches or null.
      const matches = text.match(p.re);
      if (matches) {
        for (let i = 0; i < matches.length; i++) hits.push({ kind: p.kind });
        text = text.replace(p.re, p.replace);
      }
    } else {
      text = text.replace(p.re, () => {
        hits.push({ kind: p.kind });
        return p.replace;
      });
    }
  }

  return { text, hits };
}
