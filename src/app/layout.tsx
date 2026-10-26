
import { AppTopbar } from "@/components/app-topbar";
import { ToastProvider } from "@/components/ui/toast-provider";
import { requireSession } from "@/server/auth";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniMarket | Operations Hub",
  description: "Dashboard de operaciones de comercio electrónico.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireSession();

  return (
    <html lang="es-MX">
      <body className="min-h-screen bg-[#09090B] text-zinc-100 antialiased">
        <ToastProvider>
          <AppTopbar sessionUser={user} />

          <div className="min-h-screen pt-14">
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
