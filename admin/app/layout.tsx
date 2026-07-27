import type { Metadata } from "next";
import { Red_Hat_Display } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const redHat = Red_Hat_Display({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-red-hat",
});

export const metadata: Metadata = {
  title: "100bytes Admin",
  description: "Backoffice 100bytes — Gestao da loja",
  icons: {
    icon: "https://cdn.100bytes.co.ao/logo/100byte_fav.png",
    shortcut: "https://cdn.100bytes.co.ao/logo/100byte_fav.png",
    apple: "https://cdn.100bytes.co.ao/logo/100byte_fav.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={redHat.variable}>
      <head>
        <link rel="icon" href="https://cdn.100bytes.co.ao/logo/100byte_fav.png" />
      </head>
      <body className={redHat.className} style={{ background: "#f5f5f7" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}