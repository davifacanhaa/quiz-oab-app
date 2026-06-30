import type { Metadata } from "next";
import { Poppins, Anton } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Quiz OAB – 1ª Fase",
  description: "20 questões · Gabarito + Diagnóstico de incidência OAB 42–46",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${poppins.className} ${anton.variable}`}>
      <body>{children}</body>
    </html>
  );
}
