"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface TopbarProps {
  context?: string;
  title: string;
  badge?: string;
  badgeColor?: "blue" | "green" | "orange" | "red";
}

function getInitials(name: string): string {
  if (name.includes("@")) return name.split("@")[0].slice(0, 2).toUpperCase();
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

export function Topbar({ context = "Campagnes en cours", title, badge, badgeColor = "blue" }: TopbarProps) {
  const badgeStyles = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-600",
  };
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userInitials, setUserInitials] = useState("…");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.full_name ?? user.email ?? "";
      setUserName(name);
      setUserInitials(getInitials(name) || "—");
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-[54px] bg-white border-b border-gray-200 flex items-center px-6 gap-3 flex-shrink-0">
      <div>
        <div className="text-[11px] text-gray-400">{context}</div>
        <div className="text-[15px] font-bold text-gray-900 leading-tight">{title}</div>
      </div>
      {badge && (
        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${badgeStyles[badgeColor]}`}>
          {badge}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2.5">
        <button
          aria-label="Alertes et notifications"
          onClick={() => window.dispatchEvent(new CustomEvent("copilote:open", { detail: "Quelles sont mes alertes et actions urgentes du jour ? Donne-moi une liste priorisée." }))}
          className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 relative"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
        </button>
        <button
          aria-label="Aide et documentation"
          onClick={() => window.dispatchEvent(new CustomEvent("copilote:open", { detail: "Aide-moi à utiliser SPC Cockpit : que puis-je faire depuis ce tableau de bord ? Quelles fonctionnalités sont disponibles ?" }))}
          className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
        <span className="text-gray-200 text-lg">|</span>
        {userName && <span className="text-[13px] text-gray-600">{userName}</span>}
        <div className="w-8 h-8 rounded-full bg-[#1a6b7e] text-white flex items-center justify-center text-[11px] font-bold">
          {userInitials}
        </div>
        <button
          onClick={handleLogout}
          title="Déconnexion"
          className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
