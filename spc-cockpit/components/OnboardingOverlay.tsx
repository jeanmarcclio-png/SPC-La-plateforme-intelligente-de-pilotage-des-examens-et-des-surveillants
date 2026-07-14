"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/tenant/TenantContext";
import { SECTEURS_LISTE } from "@/lib/tenant/configs";

const STORAGE_KEY = "spc_onboarding_done";

type StepId = "welcome" | "secteur" | "fonctions" | "done";
const STEPS: StepId[] = ["welcome", "secteur", "fonctions", "done"];

export function OnboardingOverlay() {
  const [visible, setVisible]   = useState(false);
  const [stepIdx, setStepIdx]   = useState(0);
  const { config, setSecteur, isReady } = useTenant();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init client-only (hydratation-safe)
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible || !isReady) return null;

  const step   = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const color  = config.couleur;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

      {/* Card */}
      <div className="relative w-full md:max-w-sm mx-auto bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Color band — changes dynamically with sector */}
        <div className="h-1.5 w-full transition-all duration-500" style={{ background: color }} />

        {/* Skip */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 text-[13px] transition-colors"
        >
          Passer
        </button>

        <div className="px-6 pt-7 pb-6">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width:      i === stepIdx ? 20 : 6,
                  height:     6,
                  background: i <= stepIdx ? color : "#e2e8f0",
                }}
              />
            ))}
          </div>

          {/* ── Step 0 : Welcome ── */}
          {step === "welcome" && (
            <div className="animate-fade-up">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5 mx-auto"
                style={{ background: `${color}18` }}
              >
                🎯
              </div>
              <h2 className="text-[20px] font-extrabold text-gray-900 text-center mb-2 leading-snug">
                Bienvenue sur JMC Cockpit
              </h2>
              <p className="text-[14px] text-gray-500 text-center leading-relaxed">
                Votre plateforme de pilotage commercial B2B. Configurez votre espace en&nbsp;3&nbsp;étapes.
              </p>
            </div>
          )}

          {/* ── Step 1 : Sector picker ── */}
          {step === "secteur" && (
            <div className="animate-fade-up">
              <h2 className="text-[18px] font-extrabold text-gray-900 text-center mb-1">
                Votre secteur d&apos;activité
              </h2>
              <p className="text-[12px] text-gray-400 text-center mb-4">
                JMC adapte le vocabulaire et les KPIs à votre métier
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SECTEURS_LISTE.map((cfg) => (
                  <button
                    key={cfg.secteur}
                    onClick={() => setSecteur(cfg.secteur)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all text-[12px] font-semibold"
                    style={{
                      borderColor: config.secteur === cfg.secteur ? cfg.couleur : "#e2e8f0",
                      background:  config.secteur === cfg.secteur ? `${cfg.couleur}12` : "white",
                      color:       config.secteur === cfg.secteur ? cfg.couleur : "#374151",
                    }}
                  >
                    <span className="text-base">{cfg.emoji}</span>
                    <span className="leading-tight">{cfg.nom}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-gray-400 text-center">
                Secteur sélectionné :{" "}
                <strong style={{ color }}>{config.emoji} {config.nom}</strong>
              </div>
            </div>
          )}

          {/* ── Step 2 : Feature tour ── */}
          {step === "fonctions" && (
            <div className="animate-fade-up">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 mx-auto"
                style={{ background: `${color}18` }}
              >
                {config.emoji}
              </div>
              <h2 className="text-[18px] font-extrabold text-gray-900 text-center mb-3">
                Mode {config.nom}
              </h2>
              <div className="space-y-2">
                {[
                  { icon: "📊", label: "Dashboard IA", desc: "KPIs temps réel + recommandations proactives" },
                  {
                    icon: "⚡",
                    label: "Qualification scoring",
                    desc: `${config.scoring.dimensions.join(" · ")} — priorisez vos « ${config.scoring.labels[0]} »`,
                  },
                  { icon: "🤖", label: "Copilote IA", desc: "Emails, scripts, analyse pipeline" },
                  { icon: "🔔", label: "Notifications push", desc: "Relances et rappels automatiques" },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex items-start gap-3 p-2.5 rounded-xl"
                    style={{ background: `${color}08` }}
                  >
                    <span className="text-lg flex-shrink-0">{f.icon}</span>
                    <div>
                      <div className="text-[12px] font-bold text-gray-800">{f.label}</div>
                      <div className="text-[11px] text-gray-500">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3 : Done ── */}
          {step === "done" && (
            <div className="animate-fade-up">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5 mx-auto"
                style={{ background: `${color}18` }}
              >
                🚀
              </div>
              <h2 className="text-[20px] font-extrabold text-gray-900 text-center mb-2">
                Vous êtes prêt !
              </h2>
              <p className="text-[14px] text-gray-500 text-center leading-relaxed">
                Cockpit {config.nom} configuré. Lancez votre première {config.vocabulaire.mission.toLowerCase()} depuis le Dashboard.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2 mt-6">
            {stepIdx > 0 && (
              <button
                onClick={() => setStepIdx(stepIdx - 1)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-[14px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Retour
              </button>
            )}
            <button
              onClick={isLast ? dismiss : () => setStepIdx(stepIdx + 1)}
              className="flex-1 py-3 rounded-2xl text-white text-[14px] font-bold transition-opacity hover:opacity-90"
              style={{ background: color }}
            >
              {isLast ? "Commencer 🚀" : "Suivant →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
