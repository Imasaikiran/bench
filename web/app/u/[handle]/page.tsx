import { notFound } from "next/navigation";
import { sql } from "../../../lib/db";
import { toPersonaShape } from "../../../lib/mapper";
import { V1Page } from "../../../lib/v1render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScanRow = { payload: unknown };

export default async function HandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const rows = (await sql`
    SELECT s.payload
    FROM profiles p
    JOIN scans s ON s.id = p.latest_scan
    WHERE p.handle = ${handle.toLowerCase()}
  `) as ScanRow[];
  if (rows.length === 0) notFound();
  const payload = rows[0]?.payload;
  if (!payload) notFound();
  return <V1Page persona={toPersonaShape(payload)} />;
}
