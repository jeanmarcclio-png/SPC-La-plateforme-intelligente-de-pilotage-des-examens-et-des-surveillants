"use client";

import Link from "next/link";
import type { ProactiveInsight } from "@/lib/ai/engine";

const palette = {
  critical:    { bg: "bg-red-50",    border: "border-red-200",   text: "text-red-800",   metric: "text-red-600",   dot: "bg-red-500" },
  opportunity: { bg: "bg-teal-50",   border: "border-teal-200",  text: "text-teal-800",  metric: "text-teal-600",  dot: "bg-teal-500" },
  info:        { bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-800",  metric: "text-blue-600",  dot: "bg-blue-400" },
};

export function InsightsBanner({ insights }: { insights: ProactiveInsight[] }) {
  if (!insights.length) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">IA Proactive</span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)] bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          Analyse en temps réel
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {insights.map((ins, i) => {
          const c = palette[ins.type];
          return (
            <Link
              key={i}
              href={ins.href}
              className={`group flex flex-col gap-1.5 p-3.5 rounded-xl border ${c.bg} ${c.border} hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-base leading-none mt-px flex-shrink-0">{ins.icon}</span>
                <p className={`text-[12.5px] font-semibold leading-snug ${c.text}`}>{ins.message}</p>
              </div>
              <p className={`text-[11px] leading-snug pl-7 ${c.metric}`}>{ins.metric}</p>
              <span className={`self-start pl-7 text-[11px] font-bold ${c.metric} group-hover:underline`}>
                Voir →
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function InsightsBannerMobile({ insights }: { insights: ProactiveInsight[] }) {
  if (!insights.length) return null;
  const ins = insights[0];
  const c   = palette[ins.type];

  return (
    <Link
      href={ins.href}
      className={`flex items-start gap-3 p-3.5 rounded-2xl border ${c.bg} ${c.border} mb-3`}
    >
      <span className="text-lg leading-none mt-0.5 flex-shrink-0">{ins.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[12.5px] font-semibold leading-snug ${c.text}`}>{ins.message}</p>
        <p className={`text-[11px] mt-0.5 ${c.metric}`}>{ins.metric}</p>
      </div>
      {insights.length > 1 && (
        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0 mt-0.5 ${ins.type === "critical" ? "bg-red-500" : "bg-teal-500"}`}>
          +{insights.length - 1}
        </span>
      )}
    </Link>
  );
}
