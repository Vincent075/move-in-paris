import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { getMessages } from "@/i18n/server";
import CookieConsent from "@/components/CookieConsent";

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
  const { locale, messages } = await getMessages();
  const ogLocale = locale === "en" ? "en_US" : "fr_FR";
  const ogLocaleAlternate = locale === "en" ? "fr_FR" : "en_US";
  return {
    metadataBase: new URL("https://www.move-in-paris.com"),
    title: messages.meta.title,
    description: messages.meta.description,
    openGraph: {
      type: "website",
      siteName: "Move in Paris",
      locale: ogLocale,
      alternateLocale: [ogLocaleAlternate],
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

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: "Move in Paris",
  url: "https://www.move-in-paris.com",
  logo: "https://www.move-in-paris.com/Logo-gold.png",
  description: "Agence parisienne spécialisée dans la location meublée haut de gamme pour entreprises et expatriés.",
  areaServed: { "@type": "City", name: "Paris" },
  address: { "@type": "PostalAddress", addressLocality: "Paris", addressCountry: "FR" },
};

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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <LocaleProvider locale={locale} messages={messages}>
          {children}
          <CookieConsent />
        </LocaleProvider>
      </body>
    </html>
  );
}
