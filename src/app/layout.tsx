import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniMarket | Operations Hub",
  description: "Dashboard de operaciones de comercio electrónico.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
