"use client";

import { useState, useTransition } from "react";
import { updateDisplayName, updatePassword, updateNotificationPref } from "@/app/actions/parametres";

function SaveFeedback({ saved, error }: { saved: boolean; error?: string }) {
  if (error) return <span className="text-[11px] text-red-500">{error}</span>;
  if (saved) return <span className="text-[11px] text-green-500 font-medium">Sauvegardé ✓</span>;
  return null;
}

export function CompteSection({ email, displayName }: { email: string; displayName: string }) {
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState("");
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleName(fd: FormData) {
    setNameError("");
    startTransition(async () => {
      try {
        await updateDisplayName(fd);
        setNameSaved(true);
        setTimeout(() => setNameSaved(false), 2500);
      } catch (e: unknown) {
        setNameError(e instanceof Error ? e.message : "Erreur");
      }
    });
  }

  function handlePassword(fd: FormData) {
    setPwdError("");
    const pwd = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;
    if (pwd !== confirm) { setPwdError("Les mots de passe ne correspondent pas"); return; }
    if (pwd.length < 6) { setPwdError("Minimum 6 caractères"); return; }
    startTransition(async () => {
      try {
        await updatePassword(fd);
        setPwdSaved(true);
        setTimeout(() => setPwdSaved(false), 2500);
      } catch (e: unknown) {
        setPwdError(e instanceof Error ? e.message : "Erreur");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Nom affiché */}
      <form action={handleName} className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Nom affiché</label>
          <SaveFeedback saved={nameSaved} error={nameError} />
        </div>
        <div className="flex gap-2">
          <input
            name="display_name"
            defaultValue={displayName}
            required
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
          />
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-2 bg-[#1a6b7e] hover:bg-[#155a6a] text-white text-[12px] font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            Sauver
          </button>
        </div>
      </form>

      {/* Email (lecture seule) */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">Email</label>
        <div className="border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-[13px] text-gray-500">{email}</div>
      </div>

      {/* Mot de passe */}
      <div className="pt-2 border-t border-gray-100">
        <button
          onClick={() => setShowPwd(!showPwd)}
          className="text-[12px] text-[#4a90d9] hover:underline font-medium"
        >
          {showPwd ? "Annuler" : "Changer le mot de passe →"}
        </button>
        {showPwd && (
          <form action={handlePassword} className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Nouveau mot de passe</label>
              <SaveFeedback saved={pwdSaved} error={pwdError} />
            </div>
            <input
              name="password"
              type="password"
              placeholder="Nouveau mot de passe (min. 6 car.)"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
            />
            <input
              name="confirm"
              type="password"
              placeholder="Confirmer le mot de passe"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
            />
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-[#1a6b7e] hover:bg-[#155a6a] text-white text-[13px] font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {pending ? "Mise à jour…" : "Mettre à jour"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const NOTIF_LABELS: Record<string, string> = {
  alertes_urgentes: "Alertes urgentes",
  rappels_echeances: "Rappels échéances",
  rapport_j30: "Rapport J+30",
};

const NOTIF_DEFAULTS: Record<string, boolean> = {
  alertes_urgentes: true,
  rappels_echeances: true,
  rapport_j30: false,
};

export function NotificationsSection({ saved }: { saved: Record<string, boolean> }) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    ...NOTIF_DEFAULTS,
    ...saved,
  });
  const [, startTransition] = useTransition();

  function toggle(key: string) {
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    startTransition(() => updateNotificationPref(key, next));
  }

  return (
    <div className="space-y-3">
      {Object.keys(NOTIF_LABELS).map((key) => (
        <div key={key} className="flex items-center justify-between py-1">
          <span className="text-[12.5px] text-gray-600">{NOTIF_LABELS[key]}</span>
          <button
            onClick={() => toggle(key)}
            className={`relative w-10 h-5 rounded-full transition-colors ${prefs[key] ? "bg-[#1a6b7e]" : "bg-gray-200"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${prefs[key] ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
