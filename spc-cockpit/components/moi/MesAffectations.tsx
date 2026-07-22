"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, MapPin, Clock } from "lucide-react";
import { confirmerAffectation, declinerAffectation } from "@/app/actions/portail";
import type { MonAffectation } from "@/lib/supabase/portail";

function statutLabel(a: MonAffectation): { txt: string; cls: string } {
  if (a.decline) return { txt: "Refus signalé", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  const s = a.statut.toLowerCase();
  if (s === "confirmee" || s === "confirmé" || s === "confirme")
    return { txt: "Confirmée", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  return { txt: "À confirmer", cls: "bg-slate-100 text-slate-600 border-slate-200" };
}

function dureeLabel(min: number | null): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function MesAffectations({ affectations }: { affectations: MonAffectation[] }) {
  if (affectations.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-[13px] text-gray-500">
        Aucune affectation à venir. Vous serez notifié dès qu&apos;une surveillance vous est proposée.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {affectations.map((a) => (
        <AffectationCard key={a.id} a={a} />
      ))}
    </div>
  );
}

function AffectationCard({ a }: { a: MonAffectation }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [declining, setDeclining] = useState(false);
  const [motif, setMotif] = useState("");
  const [error, setError] = useState("");
  const badge = statutLabel(a);

  function confirmer() {
    setError("");
    startTransition(async () => {
      const res = await confirmerAffectation(a.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function decliner() {
    setError("");
    startTransition(async () => {
      const res = await declinerAffectation(a.id, motif);
      if (res.error) setError(res.error);
      else {
        setDeclining(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-[#0d1e2e] capitalize">{a.dateLabel}</div>
          <div className="text-[13px] text-gray-600 mt-0.5">{a.creneau}</div>
          {a.creneaux.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {a.creneaux.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-teal-700 bg-teal-50 ring-1 ring-inset ring-teal-600/15 rounded-md px-2 py-0.5 tabular-nums">
                  {c.debut}–{c.fin}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12.5px] text-gray-500">
            {a.salle && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" aria-hidden /> Salle {a.salle}
              </span>
            )}
            {a.dureeMinutes && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" aria-hidden /> {dureeLabel(a.dureeMinutes)}
              </span>
            )}
          </div>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${badge.cls}`}>
          {badge.txt}
        </span>
      </div>

      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}

      {declining ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Motif (optionnel) — ex. indisponible ce jour"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#4a90d9]"
          />
          <div className="flex gap-2">
            <button
              onClick={decliner}
              disabled={pending}
              className="flex-1 py-2 rounded-xl bg-amber-600 text-white text-[13px] font-semibold disabled:opacity-50"
            >
              Envoyer le refus
            </button>
            <button
              onClick={() => setDeclining(false)}
              disabled={pending}
              className="px-4 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-600"
            >
              Annuler
            </button>
          </div>
          <p className="text-[11px] text-gray-400">
            Un refus ne modifie pas le planning : le coordinateur en est informé et décide.
          </p>
        </div>
      ) : (
        <div className="flex gap-2 mt-3">
          <button
            onClick={confirmer}
            disabled={pending}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-50"
            style={{ background: "#1a6b7e" }}
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden /> Confirmer
          </button>
          <button
            onClick={() => setDeclining(true)}
            disabled={pending}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700"
          >
            <XCircle className="w-4 h-4" aria-hidden /> Décliner
          </button>
        </div>
      )}
    </div>
  );
}
