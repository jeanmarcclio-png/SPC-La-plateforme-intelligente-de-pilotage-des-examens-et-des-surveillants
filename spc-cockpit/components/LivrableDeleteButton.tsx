"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteLivrable } from "@/app/actions/livrables";
import { showToast } from "@/components/Toast";

export function LivrableDeleteButton({ id, nom }: { id: number; nom: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Supprimer définitivement "${nom}" ?`)) return;
    startTransition(async () => {
      const result = await deleteLivrable(id);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(`"${nom}" supprimé`);
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      title={`Supprimer "${nom}"`}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
