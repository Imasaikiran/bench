import { homedir } from "node:os";
import { resolve } from "node:path";

export type Environment = {
  isRoot: boolean;
  isCI: boolean;
  claudeHome: string;
  claudeHomeOverridden: boolean;
};

const CI_VARS = [
  "CI",
  "GITHUB_ACTIONS",
  "GITLAB_CI",
  "CIRCLECI",
  "BUILDKITE",
  "TRAVIS",
  "JENKINS_URL",
] as const;

export function detectEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  sys: { getuid?: () => number } = process,
): Environment {
  const isRoot = typeof sys.getuid === "function" ? sys.getuid() === 0 : false;
  const isCI = CI_VARS.some((k) => {
    const v = env[k];
    return Boolean(v) && v !== "false" && v !== "0";
  });
  // Whitespace-only override falls back to default rather than crashing.
  const override = env.CLAUDE_HOME?.trim();
  return {
    isRoot,
    isCI,
    claudeHome: override ? resolve(override) : resolve(homedir(), ".claude"),
    claudeHomeOverridden: Boolean(override),
  };
}

/**
 * Refuses to proceed in unsafe contexts. Accepts a structural subset of
 * `Environment` so callers (and tests) don't have to construct the full type.
 */
export function refuseIfUnsafe(e: Pick<Environment, "isRoot" | "isCI">): void {
  if (e.isRoot) throw new Error("Run bench as your normal user, not root.");
  if (e.isCI) {
    throw new Error("bench is not for CI — scanning a CI runner is meaningless.");
  }
}
