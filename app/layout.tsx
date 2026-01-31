import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Voice Creator - Create Podcasts Instantly",
  description: "Transform your ideas into professional AI-generated podcasts. Choose your topic, style, and voice.",
  metadataBase: new URL("https://podcast.marcos-alvarez.dev"),
  openGraph: {
    title: "AI Voice Creator",
    description: "Transform your ideas into professional AI-generated podcasts",
    url: "https://podcast.marcos-alvarez.dev",
    siteName: "AI Voice Creator",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "AI Voice Creator Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Voice Creator",
    description: "Transform your ideas into professional AI-generated podcasts",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en" className="light">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Spline+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#fbb751] text-[#231b0f] min-h-screen">
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  );
}
