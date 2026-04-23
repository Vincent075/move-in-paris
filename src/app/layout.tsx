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

function resolveMetadataBase(): URL {
  // Pendant la migration : DNS move-in-paris.com pointe encore vers OVH/WordPress.
  // Tant que la bascule DNS n'est pas faite, on utilise le domaine Vercel stable
  // pour que og:image soit fetchable par les plateformes sociales (Facebook,
  // LinkedIn, WhatsApp, etc.). Dès que DNS switche, la variable d'env
  // NEXT_PUBLIC_PROD_URL peut être basculée vers move-in-paris.com.
  const override = process.env.NEXT_PUBLIC_PROD_URL;
  if (override) return new URL(override);
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return new URL(`https://${vercelProd}`);
  return new URL("https://www.move-in-paris.com");
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, messages } = await getMessages();
  const ogLocale = locale === "en" ? "en_US" : "fr_FR";
  const ogLocaleAlternate = locale === "en" ? "fr_FR" : "en_US";
  return {
    metadataBase: resolveMetadataBase(),
    title: messages.meta.title,
    description: messages.meta.description,
    openGraph: {
      type: "website",
      siteName: "Move in Paris",
      locale: ogLocale,
      alternateLocale: [ogLocaleAlternate],
      title: messages.meta.title,
      description: messages.meta.description,
      images: [
        {
          url: "/apartments/hero-salon.jpg",
          width: 1200,
          height: 630,
          alt: "Move in Paris — location meublée corporate à Paris",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: messages.meta.title,
      description: messages.meta.description,
      images: ["/apartments/hero-salon.jpg"],
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
