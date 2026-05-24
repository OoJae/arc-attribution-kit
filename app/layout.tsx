import type { ReactNode } from "react";
import { Toaster } from "sonner";

export const metadata = {
  title: "Arc Attribution Kit",
  description:
    "Operator credits creators on Arc. Creators claim with zero gas. A starter kit for Arc builders.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#ece4d0",
          color: "#0e0e0c",
          margin: 0,
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "32px 24px 80px",
          }}
        >
          {children}
        </div>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
