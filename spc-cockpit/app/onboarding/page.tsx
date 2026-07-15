"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganisation } from "@/app/actions/onboarding";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await createOrganisation(fd);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/operations");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f0f2f5" }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2.5 font-extrabold text-[#0d1e2e] text-xl tracking-tight mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4a90d9] flex-shrink-0" />
            Bienvenue sur SPC
          </div>
          <div className="text-[12px] text-gray-500 mt-1">
            Créez votre organisation pour démarrer. Vous en serez l&apos;administrateur.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">
              Nom de l&apos;organisation
            </label>
            <input
              name="nom"
              required
              autoFocus
              placeholder="Ex. Business School de Paris"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-[#4a90d9] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">
                Taux horaire (€/h)
              </label>
              <input
                name="taux_horaire"
                type="number"
                step="0.01"
                defaultValue="12.31"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-[#4a90d9] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">
                Coefficient net
              </label>
              <input
                name="coefficient_net"
                type="number"
                step="0.0001"
                defaultValue="0.7824"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-[#4a90d9] transition-colors"
              />
            </div>
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
            {loading ? "Création…" : "Créer mon organisation"}
          </button>
        </form>
      </div>
    </div>
  );
}
