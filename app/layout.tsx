import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <div className="mx-auto max-w-md min-h-dvh">{children}</div>
      </body>
    </html>
  );
}
