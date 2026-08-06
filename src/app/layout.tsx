import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Brownie-se — gestão para food service",
    template: "%s | Brownie-se",
  },
  description:
    "Brownie-se é o SaaS de gestão interna para hamburguerias, confeitarias, lanchonetes, restaurantes e deliveries. Precificação, controle de custos e relatórios de resultado.",
  applicationName: "Brownie-se",
  authors: [{ name: "Brownie-se" }],
  keywords: [
    "gestão de food service",
    "ficha técnica",
    "CMV",
    "precificação",
    "hamburgueria",
    "confeitaria",
    "delivery",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3B2618",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#0C3C59",
          fontFamily: "var(--font-dm-sans)",
        },
      }}
    >
      <html
        lang="pt-BR"
        className={`${dmSans.variable} ${dmSerif.variable} h-full antialiased`}
      >
        <body className="min-h-full bg-[var(--background)] text-[var(--foreground)] flex flex-col font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
