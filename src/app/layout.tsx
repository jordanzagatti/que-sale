import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "¿Qué Sale?",
  description: "Qué hacer en Buenos Aires",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
