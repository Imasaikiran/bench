import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL not set — required for /api/scan and friends");
  }
  _sql = neon(url);
  return _sql;
}

// Proxy that defers initialization until first call. The neon `sql` is both
// a tagged template function and an object — we expose only the call surface.
export const sql = new Proxy(
  function () {} as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, thisArg, args) {
      return Reflect.apply(getSql(), thisArg, args);
    },
    get(_target, prop) {
      const real = getSql();
      const value = (real as unknown as Record<string, unknown>)[prop as string];
      return typeof value === "function" ? value.bind(real) : value;
    },
  },
);
