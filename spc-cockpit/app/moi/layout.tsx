import { Toaster } from "@/components/Toast";

// Portail surveillant — shell épuré, mobile-first (ouvert depuis un lien SMS).
export default function MoiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh" style={{ background: "#f0f2f5" }}>
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#1a6b7e" }} />
          <span className="font-extrabold tracking-tight text-[#0d1e2e]">SPC · Mon espace</span>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-5 pb-16">{children}</main>
      <footer className="max-w-md mx-auto px-4 pb-8 text-center">
        <a href="/confidentialite" className="text-[11px] text-gray-400 hover:underline">
          Politique de confidentialité
        </a>
      </footer>
      <Toaster />
    </div>
  );
}
