import type { Metadata } from "next";
import "@shopify/polaris/build/esm/styles.css";
import "./globals.css";
import PolarisProvider from "@/components/providers/PolarisProvider";
import Script from "next/script";

export const metadata: Metadata = {
  title: "COD WhatsApp Verification - Shopify App",
  description: "Kapıda ödeme için WhatsApp doğrulama uygulaması",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <Script src="https://code.iconify.design/3/3.1.0/iconify.min.js" strategy="beforeInteractive" />
      </head>
      <body>
        <PolarisProvider locale="tr">
          {children}
        </PolarisProvider>
      </body>
    </html>
  );
}
