export const dynamic = "force-dynamic";

import { getProspects } from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

export async function GET() {
  const prospects = await getProspects();

  const _CA: Record<string, number> = { Commerce: 38, Santé: 32, CPGE: 20, Université: 48 };

  const debug = prospects.map((p) => {
    const fromDB   = parseFloat(p.valeurPotentielle ?? "") || 0;
    const b        = _CA[p.segment as string] ?? 30;
    const estimate = Math.round(b * (0.6 + (Number(p.scoreBANT) || 0) * 0.04));
    const contrib  = Math.max(fromDB, estimate);
    return {
      nom: p.nom,
      segment: p.segment,
      scoreBANT: p.scoreBANT,
      valeurPotentielle_raw: p.valeurPotentielle,
      fromDB,
      b,
      estimate,
      contrib,
    };
  });

  const pipelineTotal = debug.reduce((s, d) => s + d.contrib, 0);

  return NextResponse.json({ pipelineTotal, count: prospects.length, debug });
}
