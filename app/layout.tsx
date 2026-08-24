import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elena's Restaurant - West Portal",
  description: "Manage bar and main dining table reservations for Elena's Restaurant - West Portal.",
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
