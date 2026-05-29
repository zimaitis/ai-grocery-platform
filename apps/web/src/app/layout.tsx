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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Flash prevention: set data-theme before first paint
                try {
                  var theme = localStorage.getItem('grocery-theme') || 'system';
                  if (theme === 'system') {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
        <style>{`
          :root {
            --bg: #ffffff;
            --text: #1a1a2e;
            --surface: #f5f5f5;
            --border: #d0d0d0;
            --primary: #0070f3;
            --primary-hover: #005bb5;
            --input-bg: #ffffff;
            --muted: #666666;
            --error: #d32f2f;
            --success: #2e7d32;
          }

          [data-theme="dark"] {
            --bg: #0f0f23;
            --text: #e0e0e0;
            --surface: #1a1a3e;
            --border: #333366;
            --primary: #4dabf7;
            --primary-hover: #339af0;
            --input-bg: #1a1a3e;
            --muted: #888899;
            --error: #ef5350;
            --success: #66bb6a;
          }

          html {
            transition: background-color 0.2s ease, color 0.2s ease;
          }

          body {
            margin: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--bg);
            color: var(--text);
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
