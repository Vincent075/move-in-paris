import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { getMessages } from "@/i18n/server";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessages();
  return {
    metadataBase: new URL("https://www.move-in-paris.com"),
    title: messages.meta.title,
    description: messages.meta.description,
    openGraph: {
      type: "website",
      siteName: "Move in Paris",
      locale: "fr_FR",
      title: messages.meta.title,
      description: messages.meta.description,
    },
    twitter: {
      card: "summary_large_image",
      title: messages.meta.title,
      description: messages.meta.description,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, messages } = await getMessages();
  return (
    <html
      lang={locale}
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <LocaleProvider locale={locale} messages={messages}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
