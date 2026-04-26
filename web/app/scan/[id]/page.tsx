import { notFound } from "next/navigation";
import { sql } from "../../../lib/db";
import { toPersonaShape } from "../../../lib/mapper";
import { V1Page } from "../../../lib/v1render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScanRow = { payload: unknown };

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rows = (await sql`
    SELECT payload
    FROM scans
    WHERE id = ${id}
      AND (expires_at IS NULL OR expires_at > NOW())
  `) as ScanRow[];
  if (rows.length === 0) notFound();
  const payload = rows[0]?.payload;
  if (!payload) notFound();
  return <V1Page persona={toPersonaShape(payload)} />;
}
