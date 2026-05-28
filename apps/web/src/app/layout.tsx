import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Grocery",
  description: "Personal grocery intelligence platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
