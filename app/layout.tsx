import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stadler Football 3D — Brasileirão x Europa",
  description:
    "Jogo de futebol leve para navegador com 11 contra 11, dois tempos, regras completas e clubes brasileiros e europeus.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  other: {
    "codex-preview": "development",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
