"use server";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CONFIGS, DEFAULT_CONFIG } from "@/lib/tenant/configs";

function getTemplates(secteur: string) {
  const cfg = CONFIGS[secteur] ?? DEFAULT_CONFIG;
  const { email, vocabulaire } = cfg;

  return {
    j0: {
      subject: email.j0_sujet,
      body: `Bonjour,

Je me permets de vous contacter au sujet de votre gestion des ${vocabulaire.mission.toLowerCase()}s.

Survéo accompagne les ${vocabulaire.ressource.toLowerCase()}s dans l'optimisation de leurs ${vocabulaire.mission.toLowerCase()}s, l'amélioration de leurs process et la réduction des coûts opérationnels.

Seriez-vous disponible pour un échange de 30 minutes afin de vous présenter notre solution ?

Cordialement,
L'équipe Survéo`,
    },
    j3: {
      subject: `Re : ${vocabulaire.mission} — Suivi`,
      body: `Bonjour,

Je fais suite à mon message de la semaine dernière concernant la gestion de vos ${vocabulaire.mission.toLowerCase()}s.

Avez-vous eu l'occasion d'en prendre connaissance ? Je serais ravi d'échanger avec vous sur vos besoins actuels.

Bien cordialement,
L'équipe Survéo`,
    },
    j7: {
      subject: email.j7_sujet,
      body: `Bonjour,

Je reviens vers vous avec une proposition concrète : un diagnostic gratuit de 30 minutes pour analyser votre organisation actuelle et identifier les points d'optimisation.

Ce diagnostic est sans engagement et vous permettra d'obtenir un rapport personnalisé sur les gains potentiels.

Seriez-vous disponible cette semaine ou la semaine prochaine ?

Bien cordialement,
L'équipe Survéo`,
    },
    j15: {
      subject: email.j15_sujet,
      body: `Bonjour,

C'est mon dernier message avant de clore ce dossier.

Si l'optimisation de vos ${vocabulaire.mission.toLowerCase()}s n'est pas une priorité en ce moment, je comprends tout à fait. N'hésitez pas à me recontacter si votre situation évolue.

Dans le cas contraire, je suis joignable jusqu'à vendredi pour convenir d'un échange.

Bien cordialement,
L'équipe Survéo`,
    },
  };
}

export async function sendProspectEmail(prospectId: string, type: string, secteur?: string) {
  const supabase = await createClient();

  const { data: prospect } = await supabase
    .from("prospects")
    .select("nom, email")
    .eq("id", prospectId)
    .single();
  if (!prospect) throw new Error("Prospect introuvable");

  const templates = getTemplates(secteur ?? "examens");
  const template  = templates[type as keyof typeof templates];
  if (!template) throw new Error("Template inconnu");

  const cfg = CONFIGS[secteur ?? "examens"] ?? DEFAULT_CONFIG;

  if (process.env.RESEND_API_KEY && prospect.email) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from:    cfg.email.expediteur,
      to:      [prospect.email],
      subject: template.subject,
      text:    template.body,
    });
    if (error) throw new Error(error.message);
  }

  await supabase.from("email_logs").insert({
    prospect_id: prospectId,
    type,
    subject:    template.subject,
    sent_at:    new Date().toISOString(),
    status:     prospect.email && process.env.RESEND_API_KEY ? "sent" : "simulated",
  });

  revalidatePath("/qualification");
  revalidatePath("/reporting");
}

export async function getEmailLogs(prospectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_logs")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("sent_at", { ascending: false });
  return data ?? [];
}

export async function getAllEmailLogs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_logs")
    .select("*, prospects(nom)")
    .order("sent_at", { ascending: false })
    .limit(50);
  return data ?? [];
}
