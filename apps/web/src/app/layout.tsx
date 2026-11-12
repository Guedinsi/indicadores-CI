import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SuperTokensProvider } from "@/components/supertokens-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Indicadores de Campo Mourão",
  description:
    "Painel de indicadores de cidades inteligentes de Campo Mourão - PR, comparado com a região, o estado e o país.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SuperTokensProvider>{children}</SuperTokensProvider>
      </body>
    </html>
  );
}
