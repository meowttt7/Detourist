import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Detourist | Premium Travel Deals for Flexible Travelers",
  description:
    "Detourist finds business-class, first-class, and luxury stay deals that become exceptional value if you're flexible on routing, timing, or departure city.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
