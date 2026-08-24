import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { Narrateur } from "@/components/demo/Narrateur";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Survéo — Pilotage des examens et des surveillants",
  description: "Survéo — pilotage des examens et des surveillants, augmenté par l'IA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Survéo",
  },
  icons: {
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
    icon: "/icon-192.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "theme-color": "#1a6b7e",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistration />
        {children}
        {/*
          Narrateur monté ICI, au layout racine, et non dans (operations) : le
          cockpit et l'écran Salles vivent dans le groupe (ops-cockpit), qui n'a
          pas de layout propre. Un seul point de montage couvre les 18 écrans.
          La condition est évaluée côté serveur : hors démonstration, le
          composant n'est pas même envoyé au navigateur.
        */}
        {process.env.SPC_DEMO === "1" && <Narrateur />}
      </body>
    </html>
  );
}
