import { V1Page } from "../../lib/v1render";
import { getDemoPersona } from "../../lib/demo-persona";

export const metadata = {
  title: "bench — Priya (demo)",
  description: "Synthetic Tinkerer-tier portrait, shown for explainer purposes.",
};

export default function DemoPage() {
  return <V1Page persona={getDemoPersona()} />;
}
