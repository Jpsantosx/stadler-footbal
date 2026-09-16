import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stadler Football 3D — Brasileirão x Europa",
  description:
    "Futebol 8 contra 8 em 3D: 116 clubes, seis ligas, táticas, duplas locais e carreira com mercado, contratos e categorias de base.",
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
