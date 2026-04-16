import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApartmentDetail from "./ApartmentDetail";
import apartmentsData from "@/data/apartments.json";

export async function generateStaticParams() {
  return apartmentsData.map((apt) => ({ slug: apt.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const apt = apartmentsData.find((a) => a.slug === slug);
  if (!apt) return { title: "Appartement non trouvé" };
  return {
    title: `${apt.title} — ${apt.surface}m² ${apt.district} | Move in Paris`,
    description: `Location meublée corporate : ${apt.title}, ${apt.surface}m², ${apt.bedrooms} chambre(s), ${apt.district}. ${apt.description.slice(0, 150)}...`,
    keywords: `location meublée ${apt.district}, appartement meublé ${apt.address}, location corporate paris`,
  };
}

export default async function ApartmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const apt = apartmentsData.find((a) => a.slug === slug);

  if (!apt) {
    return (
      <>
        <Header />
        <main className="pt-32 pb-20 text-center">
          <h1 className="font-serif text-3xl text-noir">Appartement non trouvé</h1>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main>
        <ApartmentDetail apartment={apt} />
      </main>
      <Footer />
    </>
  );
}
