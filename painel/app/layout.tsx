import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Painel VPS — 100bytes",
  description: "Gestão e monitorização do servidor 100bytes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        {children}
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
