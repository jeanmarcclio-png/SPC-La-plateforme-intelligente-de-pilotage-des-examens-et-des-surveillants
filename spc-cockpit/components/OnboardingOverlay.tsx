"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "spc_onboarding_done";

const SLIDES = [
  {
    icon: "🎯",
    title: "Bienvenue sur JMC Cockpit",
    desc: "Votre plateforme de pilotage commercial B2B pour la surveillance d'examens. Tout votre pipeline en un coup d'œil.",
    color: "#1a6b7e",
  },
  {
    icon: "📊",
    title: "Dashboard & IA proactive",
    desc: "Vos KPIs en temps réel, une IA qui détecte les risques et vous recommande les actions prioritaires chaque matin.",
    color: "#4a90d9",
  },
  {
    icon: "⚡",
    title: "Qualification BANT",
    desc: "Scorez chaque prospect sur Budget, Autorité, Besoin et Timing. Concentrez vos efforts sur les « Très chaud ».",
    color: "#d97706",
  },
  {
    icon: "🤖",
    title: "Copilote IA disponible partout",
    desc: "Appuyez sur « Copilote » en bas de l'écran pour obtenir des recommandations, rédiger des emails ou préparer vos appels.",
    color: "#1a6b7e",
  },
];

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

      {/* Card */}
      <div className="relative w-full md:max-w-sm mx-auto bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">
        {/* Color band */}
        <div className="h-1.5 w-full" style={{ background: slide.color }} />

        {/* Skip */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 text-[13px] transition-colors"
        >
          Passer
        </button>

        <div className="px-6 pt-8 pb-6">
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5 mx-auto"
            style={{ background: `${slide.color}18` }}
          >
            {slide.icon}
          </div>

          {/* Text */}
          <h2 className="text-[20px] font-extrabold text-gray-900 text-center mb-2 leading-snug">
            {slide.title}
          </h2>
          <p className="text-[14px] text-gray-500 text-center leading-relaxed mb-6">
            {slide.desc}
          </p>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  background: i === step ? slide.color : "#e2e8f0",
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-[14px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Retour
              </button>
            )}
            <button
              onClick={isLast ? dismiss : () => setStep(step + 1)}
              className="flex-1 py-3 rounded-2xl text-white text-[14px] font-bold transition-opacity hover:opacity-90"
              style={{ background: slide.color }}
            >
              {isLast ? "Commencer 🚀" : "Suivant →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
