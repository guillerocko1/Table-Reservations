import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Table Reservations",
  description: "Manage bar and main dining table reservations.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
