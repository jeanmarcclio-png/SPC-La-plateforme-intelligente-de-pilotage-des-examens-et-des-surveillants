"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Choix / changement du mot de passe de l'utilisateur connecté.
// Atteint après un lien d'invitation ou de réinitialisation (/auth/confirm),
// ou depuis le bouton « Mot de passe » de la barre du haut.
const MIN = 10;

export default function MotDePassePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [mdp, setMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fait, setFait] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mdp.length < MIN) return setError(`Le mot de passe doit contenir au moins ${MIN} caractères.`);
    if (mdp !== confirmation) return setError("Les deux mots de passe ne correspondent pas.");

    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password: mdp });
    setLoading(false);
    if (error) {
      setError(
        /different|same/i.test(error.message)
          ? "Choisissez un mot de passe différent de l'actuel."
          : "Enregistrement impossible. Si vous venez d'un lien, il a peut-être expiré : demandez-en un nouveau."
      );
      return;
    }
    setFait(true);
    setTimeout(() => {
      router.push("/operations");
      router.refresh();
    }, 1200);
  }

  const champ =
    "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-[#4a90d9] focus-visible:ring-2 focus-visible:ring-[#4a90d9]/25 transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f0f2f5" }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-7">
          <div className="flex items-center justify-center gap-2 font-extrabold text-[#0d1e2e] text-2xl tracking-tight mb-1">
            <span className="text-[#7c5cff] text-xl leading-none" aria-hidden>✦</span>
            Survéo
          </div>
          <h1 className="text-[15px] font-bold text-gray-800 mt-3">Choisissez votre mot de passe</h1>
          {email && <p className="text-[12.5px] text-gray-500 mt-1">Compte : {email}</p>}
        </div>

        {fait ? (
          <div role="status" className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[13px] rounded-xl px-3.5 py-3 text-center">
            Mot de passe enregistré. Redirection vers votre espace…
          </div>
        ) : (
          <form onSubmit={valider} className="space-y-4" noValidate>
            <div>
              <label htmlFor="mdp" className="block text-[12px] font-semibold text-gray-500 mb-1.5">
                Nouveau mot de passe
              </label>
              <input
                id="mdp"
                type="password"
                value={mdp}
                onChange={(e) => setMdp(e.target.value)}
                required
                minLength={MIN}
                autoComplete="new-password"
                aria-describedby="mdp-aide"
                className={champ}
              />
              <p id="mdp-aide" className="text-[11.5px] text-gray-400 mt-1">
                {MIN} caractères minimum.
              </p>
            </div>
            <div>
              <label htmlFor="mdp2" className="block text-[12px] font-semibold text-gray-500 mb-1.5">
                Confirmation
              </label>
              <input
                id="mdp2"
                type="password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
                autoComplete="new-password"
                className={champ}
              />
            </div>

            {error && (
              <div role="alert" className="bg-red-50 border border-red-100 text-red-600 text-[12px] rounded-xl px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-white font-semibold text-[14px] disabled:opacity-50 transition-opacity"
              style={{ background: "#1a6b7e" }}
            >
              {loading ? "Enregistrement…" : "Enregistrer et accéder à Survéo"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
