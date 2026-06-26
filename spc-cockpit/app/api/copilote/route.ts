import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY manquante sur Vercel" }, { status: 503 });
  }

  const { messages } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: "No messages" }, { status: 400 });

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const supabase = await createClient();
    const [{ data: prospects }, { data: campagnes }] = await Promise.all([
      supabase.from("prospects").select("nom,segment,scoreBANT,statut,niveau,cluster,priorite").limit(20),
      supabase.from("campagnes").select("nom,statut,score,deadline,nombre_prospects"),
    ]);

    const scoreMoyen = prospects?.length
      ? (prospects.reduce((s, p) => s + (p.scoreBANT ?? 0), 0) / prospects.length).toFixed(1)
      : "—";
    const convertis = prospects?.filter((p) => p.statut === "Converti").length ?? 0;
    const tresChaudes = prospects?.filter((p) => p.niveau === "Très chaud").length ?? 0;

    const systemPrompt = `Tu es le copilote IA de SPC Cockpit, assistant personnel du directeur commercial de SPC.
SPC est spécialisé dans la surveillance d'examens pour l'enseignement supérieur (business schools, universités, grandes écoles).

DONNÉES TEMPS RÉEL :
- ${prospects?.length ?? 0} prospects au total
- ${tresChaudes} prospects "Très chaud"
- ${convertis} convertis
- Score BANT moyen : ${scoreMoyen}/10
- Campagnes : ${campagnes?.map((c) => `${c.nom} (${c.statut})`).join(", ") ?? "aucune"}
- Top prospects : ${prospects?.slice(0, 5).map((p) => `${p.nom} [${p.segment}, BANT ${p.scoreBANT}, ${p.statut}]`).join(" | ") ?? "aucun"}

Tu peux :
- Analyser le pipeline et identifier les priorités
- Recommander des actions concrètes
- Expliquer les scores et métriques
- Simuler des scénarios ("et si j'ajoute 5 prospects Commerce ?")
- Rédiger des messages de prospection

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
