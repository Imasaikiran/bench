// web/app/internal/metrics/page.tsx
// Admin page showing 30-day rolling Plausible event counts.
// Protected by basic-auth middleware (web/middleware.ts).
// Reads PLAUSIBLE_API_KEY and PLAUSIBLE_DOMAIN env vars.

export const dynamic = "force-dynamic";
export const revalidate = 0; // always fresh

const EVENTS = [
  "scan_upload",
  "claim_complete",
  "share_click",
  "delete_complete",
  "rescan_detect",
] as const;

async function fetchEventCount(
  event: string,
  domain: string,
  token: string,
): Promise<number | null> {
  const url = `https://plausible.io/api/v1/stats/aggregate?site_id=${encodeURIComponent(domain)}&period=30d&filters=${encodeURIComponent("event:name==" + event)}&metrics=events`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: { events?: { value?: number } };
    };
    return data.results?.events?.value ?? 0;
  } catch {
    return null;
  }
}

export default async function MetricsPage() {
  const domain = process.env["PLAUSIBLE_DOMAIN"] ?? "bench.dev";
  const token = process.env["PLAUSIBLE_API_KEY"];
  if (!token) {
    return (
      <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 720 }}>
        <h1>bench / internal metrics</h1>
        <p style={{ color: "#a33" }}>PLAUSIBLE_API_KEY not configured.</p>
      </main>
    );
  }
  const counts = await Promise.all(
    EVENTS.map((e) => fetchEventCount(e, domain, token)),
  );
  return (
    <main
      style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 720, color: "#1a1a1a" }}
    >
      <h1 style={{ fontFamily: "ui-serif, Georgia, serif" }}>bench / internal metrics</h1>
      <p style={{ color: "#666" }}>30-day rolling counts. Auto-refresh every page load.</p>
      <table cellPadding={6} style={{ borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th align="left" style={{ borderBottom: "1px solid #ddd" }}>
              event
            </th>
            <th align="right" style={{ borderBottom: "1px solid #ddd" }}>
              count
            </th>
          </tr>
        </thead>
        <tbody>
          {EVENTS.map((e, i) => (
            <tr key={e}>
              <td style={{ borderBottom: "1px solid #f0f0f0" }}>{e}</td>
              <td style={{ borderBottom: "1px solid #f0f0f0", textAlign: "right" }}>
                {counts[i] ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
