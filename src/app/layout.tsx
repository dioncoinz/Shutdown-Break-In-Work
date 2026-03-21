import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Breakinz",
  description: "Shutdown break-in workflow built by Valeron",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
