import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "../../../lib/db";
import { toPersonaShape } from "../../../lib/mapper";
import { V1Page } from "../../../lib/v1render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORIGIN = process.env["BENCH_PUBLIC_ORIGIN"] ?? "https://bench.dev";

type ScanRow = { payload: unknown };

// TODO(perf): generateMetadata and the page component both run the same SELECT.
// Next.js deduplicates fetch() calls but not raw SQL. For phase 1 a duplicate
// query is acceptable; wire through a shared cache or RSC context later.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const rows = (await sql`
    SELECT payload
    FROM scans
    WHERE id = ${id}
      AND (expires_at IS NULL OR expires_at > NOW())
  `) as ScanRow[];
  if (rows.length === 0 || !rows[0]?.payload) {
    return {};
  }
  const persona = toPersonaShape(rows[0].payload);
  const bareHandle = persona.handle.replace(/^@/, "");
  return {
    title: `${persona.handle} on bench`,
    openGraph: {
      images: [`${ORIGIN}/api/og/${bareHandle}`],
    },
  };
}

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
  return <V1Page persona={toPersonaShape(payload)} scanId={id} />;
}
