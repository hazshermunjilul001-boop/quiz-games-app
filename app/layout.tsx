import type { Metadata } from "next";
import "./globals.css";
import Banner from "@/components/Banner";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — free quiz games for DepEd teachers`,
  description: "Turn any test into an interactive quiz game, free for teachers.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" style={{ colorScheme: "light" }}>
      <body className="min-h-full flex flex-col font-sans">
        <Banner />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
