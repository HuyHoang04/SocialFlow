import type { Metadata } from "next";
import "./globals.css";
import { BrandProvider } from "@/lib/brand-context";

export const metadata: Metadata = {
  title: "SocialFlow - Multi-Platform Publisher",
  description: "Create and publish posts to Facebook, X/Twitter, and LinkedIn from one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BrandProvider>{children}</BrandProvider>
      </body>
    </html>
  );
}
