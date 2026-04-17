import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApartmentDetail from "./ApartmentDetail";
import apartmentsDataRaw from "@/data/apartments.json";
import type { ApartmentRecord } from "@/data/apartment-types";

const apartmentsData = apartmentsDataRaw as ApartmentRecord[];

export async function generateStaticParams() {
  return apartmentsData.map((apt) => ({ slug: apt.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const apt = apartmentsData.find((a) => a.slug === slug);
  if (!apt) return { title: "Appartement non trouvé" };
  const title = `${apt.title} — ${apt.surface}m² ${apt.district} | Move in Paris`;
  const description = `Location meublée corporate : ${apt.title}, ${apt.surface}m², ${apt.bedrooms} chambre(s), ${apt.district}. ${apt.description.slice(0, 150)}...`;
  const cover = apt.images && apt.images.length > 0 ? apt.images[0] : "/Logo-gold.png";
  return {
    title,
    description,
    keywords: `location meublée ${apt.district}, appartement meublé ${apt.address}, location corporate paris`,
    openGraph: {
      type: "website",
      siteName: "Move in Paris",
      locale: "fr_FR",
      title,
      description,
      images: [{ url: cover, width: 1200, height: 630, alt: apt.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [cover],
    },
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
