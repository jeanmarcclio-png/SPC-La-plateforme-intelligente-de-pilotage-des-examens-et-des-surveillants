// Agent spc-planning-risk-auditor — POC LECTURE SEULE.
// Le modèle EXPLIQUE et PRIORISE des risques déjà calculés de façon
// déterministe ; il ne calcule rien et ne propose aucune action automatique.
// Payload minimisé (aucune donnée personnelle), garde-fou anti-PII, auth requise.

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getModelPayload } from "@/lib/agents/planning-risk/tools";
import { assertNoPII } from "@/lib/agents/redaction";
import { checkRateLimitBy, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Auth obligatoire
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Limite anti-abus sur cet endpoint IA coûteux (par utilisateur + IP).
  const rl = checkRateLimitBy(`planning-risk:${user.id}:${clientIp(req.headers)}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans un instant." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const missionId: number | null = typeof body.missionId === "number" ? body.missionId : null;
  const todayISO: string = typeof body.todayISO === "string" ? body.todayISO : new Date().toISOString().slice(0, 10);

  const payload = await getModelPayload(missionId, todayISO);
  if (!payload) return NextResponse.json({ error: "Aucune mission analysable" }, { status: 404 });

  // Garde-fou RGPD : rien de personnel ne doit atteindre le modèle.
  const guard = assertNoPII(payload);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 422 });

  // Sans clé API : on renvoie le rapport déterministe, sans narratif IA.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ narrative: null, note: "ANTHROPIC_API_KEY absente — rapport déterministe uniquement.", payload });
  }

  const system = `Tu es « SPC Planning Risk Auditor », un analyste de risques opérationnels pour la surveillance d'examens.
RÈGLES ABSOLUES :
- Tu es en LECTURE SEULE. Tu n'appliques JAMAIS d'action (pas d'affectation, pas de modification, pas d'envoi).
- Tu ne recalcules RIEN : les risques et leurs preuves te sont fournis, déjà calculés. Tu les expliques et les priorises.
- Toute recommandation doit être validée par un humain ; formule-les comme des propositions, jamais des ordres exécutés.
- Reste factuel, concis, en français. Ne cite que des identifiants (S-12, salles, références) — jamais de nom, téléphone ou e-mail.
Produis : (1) une synthèse en 2 phrases, (2) les risques classés du plus au moins critique avec une explication courte, (3) l'ordre d'action recommandé pour un coordinateur.`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 900,
      system,
      messages: [
        { role: "user", content: `Voici le rapport de risque déterministe (JSON) d'une session d'examens. Explique et priorise pour un coordinateur.\n\n${JSON.stringify(payload, null, 2)}` },
      ],
    });
    const narrative = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
    return NextResponse.json({ narrative, payload });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur agent", payload }, { status: 502 });
  }
}
