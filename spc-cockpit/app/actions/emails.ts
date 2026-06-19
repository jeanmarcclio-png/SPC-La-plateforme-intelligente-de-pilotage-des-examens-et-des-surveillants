"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const TEMPLATES: Record<string, { subject: string; body: string }> = {
  j0: {
    subject: "SPC — Solution de surveillance d'examens pour votre établissement",
    body: `Bonjour,

Je me permets de vous contacter au sujet de la gestion de vos examens et de la surveillance des sessions.

SPC accompagne les directions des examens d'établissements post-bac (business schools, universités, grandes écoles) dans la coordination de surveillants, la gestion du tiers-temps et la sécurisation logistique des sessions.

Seriez-vous disponible pour un échange de 30 minutes afin de vous présenter notre solution ?

Cordialement,
L'équipe SPC`,
  },
  j3: {
    subject: "Re : Solution de surveillance d'examens — Suivi",
    body: `Bonjour,

Je fais suite à mon message de la semaine dernière concernant la gestion de vos sessions d'examens.

Avez-vous eu l'occasion d'en prendre connaissance ? Je serais ravi d'échanger avec vous sur vos besoins actuels, notamment en matière de tiers-temps et de coordination de surveillants.

Bien cordialement,
L'équipe SPC`,
  },
  j7: {
    subject: "SPC — Audit gratuit 30 min pour votre direction des examens",
    body: `Bonjour,

Je reviens vers vous avec une proposition concrète : un audit gratuit de 30 minutes pour analyser votre organisation actuelle des examens et identifier les points d'optimisation.

Cet audit est sans engagement et vous permettra d'obtenir un rapport personnalisé sur les gains potentiels (temps, coût, conformité tiers-temps).

Seriez-vous disponible cette semaine ou la semaine prochaine ?

Bien cordialement,
L'équipe SPC`,
  },
  j15: {
    subject: "Dernière tentative — Surveillance d'examens SPC",
    body: `Bonjour,

C'est mon dernier message avant de clore ce dossier.

Si la gestion des examens n'est pas une priorité en ce moment, je comprends tout à fait. N'hésitez pas à me recontacter si votre situation évolue — nous restons disponibles.

Dans le cas contraire, je suis joignable jusqu'à vendredi pour convenir d'un échange.

Bien cordialement,
L'équipe SPC`,
  },
};

export async function sendProspectEmail(prospectId: string, type: string) {
  const supabase = await createClient();

  const { data: prospect } = await supabase.from("prospects").select("nom, email").eq("id", prospectId).single();
  if (!prospect) throw new Error("Prospect introuvable");

  const template = TEMPLATES[type];
  if (!template) throw new Error("Template inconnu");

  await supabase.from("email_logs").insert({
    prospect_id: prospectId,
    type,
    subject: template.subject,
    sent_at: new Date().toISOString(),
    status: "sent",
  });

  revalidatePath("/qualification");
  revalidatePath("/reporting");
}

export async function getEmailLogs(prospectId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("email_logs").select("*").eq("prospect_id", prospectId).order("sent_at", { ascending: false });
  return data ?? [];
}
