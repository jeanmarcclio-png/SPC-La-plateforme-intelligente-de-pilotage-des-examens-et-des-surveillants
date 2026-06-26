type BadgeVariant = "tres-chaud" | "chaud" | "tide" | "froid" | "valide" | "en-cours" | "a-rediger" | "a-renforcer" | "actif" | "termine";

const styles: Record<BadgeVariant, string> = {
  "tres-chaud": "bg-red-50 text-red-700",
  "chaud":      "bg-yellow-50 text-yellow-800",
  "tide":       "bg-gray-100 text-gray-600",
  "froid":      "bg-blue-50 text-blue-700",
  "valide":     "bg-green-50 text-green-700",
  "en-cours":   "bg-blue-50 text-blue-800",
  "a-rediger":  "bg-purple-50 text-purple-800",
  "a-renforcer":"bg-red-50 text-red-800",
  "actif":      "bg-blue-50 text-blue-700",
  "termine":    "bg-green-50 text-green-700",
};

const dots: Partial<Record<BadgeVariant, string>> = {
  "tres-chaud": "bg-red-500",
  "chaud":      "bg-yellow-400",
  "valide":     "bg-green-500",
  "en-cours":   "bg-blue-400",
  "a-rediger":  "bg-purple-500",
  "a-renforcer":"bg-red-500",
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {dots[variant] && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dots[variant]}`} />
      )}
      {children}
    </span>
  );
}

export function ScoreTag({ score }: { score: number }) {
  const color = score >= 9 ? "bg-green-50 text-green-800" : score >= 7 ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-800";
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {score} / 10
    </span>
  );
}
