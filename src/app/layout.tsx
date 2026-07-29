import type { Metadata } from "next";
import { ApprovalNotificationBell } from "@/components/ApprovalNotificationBell";
import { getCurrentUser } from "@/lib/auth/current-user";
import "./globals.css";

export const metadata: Metadata = {
  title: "Breakinz",
  description: "Shutdown emergent workflow built by Valeron",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {currentUser ? <ApprovalNotificationBell role={currentUser.role} /> : null}
      </body>
    </html>
  );
}
