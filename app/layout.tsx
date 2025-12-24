import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "cayoh.run - Personal Homepage",
  description: "VidCast AI - YouTube 視頻播報式總結生成器",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' }, // 優先使用 SVG（支援深色模式）
      { url: '/icon.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
