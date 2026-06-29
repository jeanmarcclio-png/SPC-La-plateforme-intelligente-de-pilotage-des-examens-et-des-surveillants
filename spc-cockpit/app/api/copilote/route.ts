import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CONFIGS, DEFAULT_CONFIG } from "@/lib/tenant/configs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY manquante sur Vercel" }, { status: 503 });
  }

  const { messages, secteur } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: "No messages" }, { status: 400 });

  const cfg = CONFIGS[secteur as string] ?? DEFAULT_CONFIG;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const [{ data: prospects }, { data: campagnes }] = await Promise.all([
      supabase.from("prospects").select("nom,segment,score_bant,statut,niveau,cluster,priorite,valeur_potentielle").limit(20),
      supabase.from("campagnes").select("nom,statut,score,deadline,nombre_prospects,tres_chaudes"),
    ]);

    const scoreMoyen = prospects?.length
      ? (prospects.reduce((s, p) => s + (p.score_bant ?? 0), 0) / prospects.length).toFixed(1)
      : "—";
    const convertis = prospects?.filter((p) => p.statut === "Converti").length ?? 0;
    const tresChaudes = prospects?.filter((p) => p.niveau === cfg.scoring.labels[0]).length ?? 0;
    const pipelineCA = prospects?.reduce((s, p) => s + (parseFloat(p.valeur_potentielle ?? "0") || 0), 0) ?? 0;

    const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const systemPrompt = `Tu es le copilote IA de JMC Cockpit, assistant personnel du directeur commercial de JMC.
JMC est spécialisé dans le secteur : ${cfg.nom} ${cfg.emoji}
Cible : ${cfg.interlocuteurs.join(", ")}
Segments : ${cfg.segments.join(", ")}
Zones : ${cfg.clusters.join(", ")}

Vocabulaire métier :
- ${cfg.vocabulaire.mission} (= mission/campagne)
- ${cfg.vocabulaire.ressource} (= prospect/client)
- ${cfg.vocabulaire.pipeline} (= pipeline)
- ${cfg.vocabulaire.livrable} (= livrable)

Niveaux de chaleur : ${cfg.scoring.labels.join(" > ")}
Dimensions scoring : ${cfg.scoring.dimensions.join(", ")}

AUJOURD'HUI : ${today}

DONNÉES TEMPS RÉEL :
- ${prospects?.length ?? 0} ${cfg.vocabulaire.ressource.toLowerCase()}s au total
- ${tresChaudes} "${cfg.scoring.labels[0]}"
- ${convertis} convertis
- Score ${cfg.scoring.dimensions[0]} moyen : ${scoreMoyen}/10
- ${cfg.vocabulaire.pipeline} CA estimé : ${pipelineCA > 0 ? `${pipelineCA}k€` : "non renseigné"}
- ${cfg.vocabulaire.mission}s : ${campagnes?.map((c) => `${c.nom} (${c.statut}, score ${c.score})`).join(", ") ?? "aucune"}
- Top ${cfg.vocabulaire.ressource.toLowerCase()}s : ${prospects?.slice(0, 5).map((p) => `${p.nom} [${p.segment}, ${cfg.scoring.dimensions[0]} ${p.score_bant}, ${p.statut}${p.valeur_potentielle ? `, ${p.valeur_potentielle}k€` : ""}]`).join(" | ") ?? "aucun"}

Risques courants dans ce secteur : ${cfg.risques.join(", ")}
Points forts à valoriser : ${cfg.points_forts.join(", ")}

Tu peux :
- Analyser le pipeline et identifier les priorités
- Recommander des actions concrètes adaptées au secteur ${cfg.nom}
- Expliquer les scores et métriques
- Simuler des scénarios
- Rédiger des messages de prospection adaptés aux ${cfg.interlocuteurs[0] ?? "décideurs"}

Réponds toujours en français. Sois direct, concis, actionnable. Maximum 200 mots. Utilise des bullets quand c'est plus clair.`;

    const anthropicStream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta" &&
              event.delta.text
            ) {
              const data = `data: ${JSON.stringify({ delta: { text: event.delta.text } })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erreur stream";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        } finally {
          controller.close();
        }
      },
      cancel() {
        anthropicStream.abort();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
