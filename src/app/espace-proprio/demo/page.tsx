import type { Metadata } from "next";
import Footer from "@/components/Footer";
import DemoDashboard from "@/components/espace-proprio/DemoDashboard";
import { DEMO_DATA } from "@/lib/espace-proprio/mock";

export const metadata: Metadata = {
  title: "Espace Propriétaire · Démonstration · Move in Paris",
  description: "Démonstration de l’espace propriétaire Move in Paris (données fictives).",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
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
