import type { Metadata } from "next";
import "./globals.css";
import { AppTopbar } from "@/components/app-topbar";
import { requireSession } from "@/server/auth";

export const metadata: Metadata = {
  title: "OmniMarket | Operations Hub",
  description: "Dashboard de operaciones de comercio electrónico.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
   const user = await requireSession();
  return (
    <html lang="es-MX">
     <body className="min-h-screen bg-[#09090B] text-zinc-100 antialiased">
  <AppTopbar sessionUser={user} />
  <div className="min-h-screen pt-14">
    {children}
  </div>
</body>
    </html>
  );
}
