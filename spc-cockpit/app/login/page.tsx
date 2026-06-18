"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0f2f5" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-[#0d1e2e] font-extrabold text-xl tracking-tight mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4a90d9]" />
            SPC COCKPIT
          </div>
          <div className="text-[11px] text-[#4a90d9] uppercase tracking-[2px]">Prospection B2B</div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
          <div className="text-[17px] font-bold text-gray-900 mb-1">Connexion</div>
          <div className="text-[12.5px] text-gray-400 mb-6">Accès réservé à l&apos;équipe SPC</div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jeanmarcclio@gmail.com"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
              />
            </div>

            {error && (
              <div className="text-[12px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#1a6b7e] hover:bg-[#155a6a] text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>

        <div className="text-center mt-4 text-[11.5px] text-gray-400">
          SPC — Pilotage Prospection B2B · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
