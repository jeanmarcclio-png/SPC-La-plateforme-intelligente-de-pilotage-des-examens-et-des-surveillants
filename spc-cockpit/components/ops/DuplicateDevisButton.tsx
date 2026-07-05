"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateDevis } from "@/app/actions/devis";
import { showToast } from "@/components/Toast";
import { Copy } from "lucide-react";

export function DuplicateDevisButton({ id, reference }: { id: number; reference: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await duplicateDevis(id);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(`${reference} dupliqué en brouillon`);
        if (result.newId) router.push(`/operations/devis/${result.newId}`);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-[13px] font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 print:hidden"
    >
      <Copy className="w-4 h-4" aria-hidden />
      {pending ? "Duplication…" : "Dupliquer"}
    </button>
  );
}
