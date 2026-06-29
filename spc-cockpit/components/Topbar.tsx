"use client";

import { useState, useEffect } from "react";
import { Bell, HelpCircle, LogOut } from "lucide-react";
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
  const [syncedAt] = useState(() => Date.now());
  const [syncLabel, setSyncLabel] = useState("À l'instant");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.full_name ?? user.email ?? "";
      setUserName(name);
      setUserInitials(getInitials(name) || "—");
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const mins = Math.floor((Date.now() - syncedAt) / 60000);
      setSyncLabel(mins === 0 ? "À l'instant" : mins === 1 ? "Il y a 1 min" : `Il y a ${mins} min`);
    }, 30000);
    return () => clearInterval(id);
  }, [syncedAt]);

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
      <span className="flex items-center gap-1 text-[11px] text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        {syncLabel}
      </span>
      <div className="ml-auto flex items-center gap-2.5">
        <button
          aria-label="Alertes et notifications"
          onClick={() => window.dispatchEvent(new CustomEvent("copilote:open", { detail: "Quelles sont mes alertes et actions urgentes du jour ? Donne-moi une liste priorisée." }))}
          className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 relative"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
        </button>
        <button
          aria-label="Aide et documentation"
          onClick={() => window.dispatchEvent(new CustomEvent("copilote:open", { detail: "Aide-moi à utiliser JMC Cockpit : que puis-je faire depuis ce tableau de bord ? Quelles fonctionnalités sont disponibles ?" }))}
          className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
        <span className="text-gray-200 text-lg">|</span>
        {userName && <span className="text-[13px] text-gray-600">{userName}</span>}
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-[11px] font-bold">
          {userInitials}
        </div>
        <button
          onClick={handleLogout}
          title="Déconnexion"
          className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
