"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f0f2f5" }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 font-extrabold text-[#0d1e2e] text-xl tracking-tight mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4a90d9] flex-shrink-0" />
            JMC COCKPIT
          </div>
          <div className="text-[11px] text-[#4a90d9] uppercase tracking-[2px] mt-0.5">
            Plateforme de pilotage B2B
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-[#4a90d9] transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-[12px] rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-white font-semibold text-[14px] disabled:opacity-50 transition-opacity mt-2"
            style={{ background: "#1a6b7e" }}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-[11px] text-gray-400 mt-6">
          Accès réservé aux collaborateurs JMC
        </p>
      </div>
    </div>
  );
}
