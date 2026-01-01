import "./globals.css";
import { GameStatusBanner } from "@/components/GameStateBanner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <div className="mx-auto max-w-md min-h-dvh">
          <GameStatusBanner />
          {children}
        </div>
      </body>
    </html>
  );
}
