"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { diagnostiquerErreurAuth } from "@/lib/auth/message-erreur-auth";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "password" | "magic";

function LoginForm() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // Distingue une saisie fautive d'une installation en cause : voir
  // lib/auth/message-erreur-auth.ts.
  const [configuration, setConfiguration] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get("redirect") ?? "/operations";

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setConfiguration(false);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const diag = diagnostiquerErreurAuth(error);
      setError(diag.message);
      setConfiguration(diag.configuration);
      setLoading(false);
    } else {
      router.push(redirect);
      router.refresh();
    }
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setConfiguration(false);
    setLoading(true);

    const supabase = createClient();
    const emailRedirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } });

    setLoading(false);
    if (error) {
      const diag = diagnostiquerErreurAuth(error);
      setError(diag.configuration ? diag.message : "Envoi du lien impossible. Vérifiez l'adresse email.");
      setConfiguration(diag.configuration);
    } else {
      setNotice("Lien de connexion envoyé. Consultez votre boîte mail.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f0f2f5" }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 font-extrabold text-[#0d1e2e] text-2xl tracking-tight mb-1">
            <span className="text-[#7c5cff] text-xl leading-none flex-shrink-0" aria-hidden>✦</span>
            Survéo
          </div>
          <div className="text-[10.5px] text-gray-500 uppercase tracking-[1.5px] mt-0.5">
            Pilotage des examens <span className="text-[#7c5cff] font-semibold">augmenté par l&apos;IA</span>
          </div>
        </div>

        {/* Sélecteur de mode */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-5 text-[12px] font-semibold">
          <button
            type="button"
            onClick={() => { setMode("password"); setError(""); setNotice(""); }}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${mode === "password" ? "bg-white shadow text-[#0d1e2e]" : "text-gray-500"}`}
          >
            Mot de passe
          </button>
          <button
            type="button"
            onClick={() => { setMode("magic"); setError(""); setNotice(""); }}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${mode === "magic" ? "bg-white shadow text-[#0d1e2e]" : "text-gray-500"}`}
          >
            Lien magique
          </button>
        </div>

        <form onSubmit={mode === "password" ? handlePassword : handleMagic} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="vous@exemple.com"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-[#4a90d9] transition-colors"
            />
          </div>

          {mode === "password" && (
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                /*
                 * SURTOUT PAS une suite de points : elle est indiscernable d'un
                 * mot de passe masqué déjà saisi. Un utilisateur a cru le champ
                 * rempli, a cliqué, et n'a obtenu que « Veuillez renseigner ce
                 * champ » — en concluant que son mot de passe était refusé.
                 * Un texte indicatif doit se lire comme une indication.
                 */
                placeholder="Votre mot de passe"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-[#4a90d9] transition-colors"
              />
            </div>
          )}

          {error && (
            /*
             * Deux registres, parce que les deux causes n'appellent pas la même
             * action. Rouge : votre saisie est à corriger. Ambre : rien à
             * ressaisir, c'est l'installation qui est en cause — laisser
             * l'utilisateur retenter un mot de passe correct serait le faire
             * tourner en rond.
             */
            <div
              role="alert"
              className={
                configuration
                  ? "bg-amber-50 border border-amber-200 text-amber-800 text-[12px] rounded-xl px-3.5 py-2.5"
                  : "bg-red-50 border border-red-100 text-red-600 text-[12px] rounded-xl px-3.5 py-2.5"
              }
            >
              {configuration && <span className="font-semibold block mb-0.5">Problème de configuration</span>}
              {error}
            </div>
          )}
          {notice && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[12px] rounded-xl px-3.5 py-2.5">
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-white font-semibold text-[14px] disabled:opacity-50 transition-opacity mt-2"
            style={{ background: "#1a6b7e" }}
          >
            {loading ? "Veuillez patienter…" : mode === "password" ? "Se connecter" : "Recevoir un lien"}
          </button>
        </form>

        <p className="text-center text-[11px] text-gray-400 mt-6">
          Accès réservé aux collaborateurs autorisés
        </p>
        <p className="text-center text-[11px] mt-2">
          <a href="/confidentialite" className="text-[#4a90d9] hover:underline">Politique de confidentialité</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
