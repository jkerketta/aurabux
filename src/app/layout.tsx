import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aurabux — Fake Stock Trading Game",
  description: "Start with 1000 ABX and compete with friends by picking real stocks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster
          position="top-center"
          duration={3000}
          toastOptions={{
            style: {
              background: "#ffffff",
              color: "#000000",
              border: "1px solid #e5e5e5",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
            },
          }}
        />
      </body>
    </html>
  );
}
