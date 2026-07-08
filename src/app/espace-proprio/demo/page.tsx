import type { Metadata } from "next";
import Footer from "@/components/Footer";
import DemoDashboard from "@/components/espace-proprio/DemoDashboard";
import { DEMO_DATA } from "@/lib/espace-proprio/mock";

const OG_TITLE = "Espace Propriétaire · Démonstration · Move in Paris";
const OG_DESCRIPTION =
  "Découvrez l’espace propriétaire Move in Paris : occupation, entretien, documents et interventions de vos appartements, dans un espace sécurisé.";

export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    type: "website",
    siteName: "Move in Paris",
    locale: "fr_FR",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [
      {
        url: "/apartments/hero-salon.jpg",
        width: 1200,
        height: 630,
        alt: "Espace Propriétaire Move in Paris",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ["/apartments/hero-salon.jpg"],
  },
};

export default function EspaceProprioDemo() {
  return (
    <>
      <DemoDashboard data={DEMO_DATA} />
      <Footer />
    </>
  );
}
