import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "360° Turn-Around",
  description: "Scroll-driven character turntable hero section",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
