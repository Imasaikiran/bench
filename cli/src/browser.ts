import { spawn as nodeSpawn } from "node:child_process";

type SpawnFn = (
  cmd: string,
  args: string[],
  opts: { stdio: "ignore"; detached: boolean },
) => { unref: () => void; on?: (event: string, listener: (err: Error) => void) => void };

/**
 * Returns the [command, args] pair needed to open `url` on the given platform.
 * Throws if the platform is unsupported or the URL scheme is not http(s).
 */
export function openCommand(
  platform: NodeJS.Platform,
  url: string,
): [string, string[]] {
  if (!/^https?:\/\//.test(url)) {
    throw new Error(`invalid url: ${url}`);
  }
  switch (platform) {
    case "darwin":
      return ["open", [url]];
    case "win32":
      // The "" is start's window-title positional arg — without it, start
      // interprets a quoted URL as the title and never opens the browser.
      // See https://ss64.com/nt/start.html
      return ["cmd", ["/c", "start", "", url]];
    case "linux":
      return ["xdg-open", [url]];
    default:
      throw new Error(`unsupported platform: ${platform}`);
  }
}

/**
 * Opens `url` in the system default browser.
 * The spawned child is detached and unref'd so the bench process can exit
 * independently of the browser.
 */
export function openUrl(
  url: string,
  opts?: { platform?: NodeJS.Platform; spawn?: SpawnFn },
): void {
  const platform = opts?.platform ?? process.platform;
  const spawnFn: SpawnFn = opts?.spawn ?? nodeSpawn;
  const [cmd, args] = openCommand(platform, url);
  try {
    const child = spawnFn(cmd, args, { stdio: "ignore", detached: true });
    child.on?.("error", () => {});  // swallow async ENOENT etc; fire-and-forget contract
    child.unref();
  } catch (err) {
    throw new Error(`failed to open browser: ${cmd} ${args.join(" ")}`, { cause: err });
  }
}
