import type { Metadata } from "next";
import "./globals.css";
import { BrandProvider } from "@/lib/brand-context";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "SocialFlow - Multi-Platform Publisher",
  description: "Create and publish posts to Facebook, X/Twitter, and LinkedIn from one place.",
  icons: {
    icon: [
      {
        url: "/logoSmall.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <BrandProvider>{children}</BrandProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
