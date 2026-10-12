"use client";

/**
 * Last-resort error page (the root layout itself failed, so no translations
 * or styles are available). Shows Next's error digest for Vercel → Logs.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const code = error.digest ?? (error.message || error.name).slice(0, 120);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 16 }}>
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22 }}>Something went wrong · Wax ayaa khaldamay</h1>
          <p>Send us this code · Noo soo dir koodhkan:</p>
          <code style={{ display: "block", padding: 8, background: "#8882", borderRadius: 6, wordBreak: "break-all" }}>{code}</code>
          <p style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
            <button type="button" onClick={reset}>
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload is the point here */}
            <a href="/dashboard">Dashboard</a>
          </p>
        </main>
      </body>
    </html>
  );
}
