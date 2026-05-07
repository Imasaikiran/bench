export type Args = {
  version: boolean;
  why: boolean;
  offline: boolean;
  handle: string | null;
  debug: boolean;
  dryRun: boolean;
  rubric: string | null;
};

/**
 * Parse CLI argv into an Args object.
 *
 * Recognised flags:
 *   --version   boolean
 *   --why       boolean
 *   --offline   boolean
 *   --handle    <name>   (requires value, throws if missing or starts with --)
 *   --debug     boolean
 *   --dry-run   boolean
 *   --rubric    <path>   (requires value, throws if missing or starts with --)
 *
 * Unknown flags throw `Error("unknown flag: <flag>")`.
 */
export function parseArgs(argv: string[]): Args {
  const args: Args = {
    version: false,
    why: false,
    offline: false,
    handle: null,
    debug: false,
    dryRun: false,
    rubric: null,
  };

  let i = 0;
  while (i < argv.length) {
    const tok = argv[i]!;

    switch (tok) {
      case "--version":
        args.version = true;
        break;
      case "--why":
        args.why = true;
        break;
      case "--offline":
        args.offline = true;
        break;
      case "--debug":
        args.debug = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--handle": {
        const val = argv[i + 1];
        if (val === undefined || val.startsWith("--")) {
          throw new Error(`--handle requires a value`);
        }
        args.handle = val;
        i++;
        break;
      }
      case "--rubric": {
        const val = argv[i + 1];
        if (val === undefined || val.startsWith("--")) {
          throw new Error(`--rubric requires a value`);
        }
        args.rubric = val;
        i++;
        break;
      }
      default:
        throw new Error(`unknown flag: ${tok}`);
    }

    i++;
  }

  return args;
}
